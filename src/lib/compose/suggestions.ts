import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { ensureDraftSectionVersion, recordDraftSectionVersion } from "@/lib/compose/versions";
import { toInputJson } from "@/lib/prisma/json";
import { generateSuggestion } from "./suggestion-generator";

const suggestionInputSchema = z.object({
  projectId: z.string(),
  draftSectionId: z.string(),
  suggestionType: z.enum(["improvement", "clarity", "expansion"]).default("improvement"),
  narrativeVoice: z.enum(["neutral", "confident", "cautious"]).optional(),
});

export type CreateSuggestionInput = z.infer<typeof suggestionInputSchema>;

export type DraftSuggestionRecord = {
  id: string;
  projectId: string;
  draftSectionId: string;
  suggestionType: string;
  summary: string | null;
  diff: Prisma.JsonValue;
  content: Prisma.JsonValue | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
};

export async function createDraftSuggestion(input: CreateSuggestionInput) {
  const data = suggestionInputSchema.parse(input);

  const section = await prisma.draftSection.findUnique({
    where: { id: data.draftSectionId },
    include: {
      project: true,
      citations: {
        include: {
          ledgerEntry: {
            select: {
              id: true,
              citationKey: true,
              verifiedByHuman: true,
            },
          },
        },
      },
    },
  });

  if (!section || section.projectId !== data.projectId) {
    throw new Error("Draft section not found for project");
  }

  const verifiedCitations = section.citations
    .filter((citation) => citation.ledgerEntry.verifiedByHuman)
    .map((citation) => citation.ledgerEntry.citationKey);

  const primaryParagraph = extractPrimaryParagraph(section.content);

  const generated = await generateSuggestion({
    projectId: section.projectId,
    sectionId: section.id,
    suggestionType: data.suggestionType,
    narrativeVoice: data.narrativeVoice,
    currentText: primaryParagraph,
    heading: extractHeading(section.content),
    verifiedCitations,
  });

  const updatedContent = appendParagraph(section.content, generated.content);

  const suggestion = await prisma.draftSuggestion.create({
    data: {
      projectId: section.projectId,
      draftSectionId: section.id,
      suggestionType: data.suggestionType,
      summary: generated.summary,
      diff: toInputJson(generated.diff),
      content: toInputJson(updatedContent),
    },
  });

  await logActivity({
    projectId: section.projectId,
    action: "draft.suggestion_created",
    payload: {
      draftSectionId: section.id,
      suggestionId: suggestion.id,
      suggestionType: suggestion.suggestionType,
    },
  });

  return suggestion;
}

type SuggestionDiff = {
  type: "append_paragraph";
  before: string;
  after: string;
};

export async function listDraftSuggestions(projectId: string, draftSectionId?: string) {
  return prisma.draftSuggestion.findMany({
    where: {
      projectId,
      ...(draftSectionId ? { draftSectionId } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function resolveDraftSuggestion(
  suggestionId: string,
  action: "accept" | "dismiss",
  actor = "system",
) {
  const suggestion = await prisma.draftSuggestion.findUnique({
    where: { id: suggestionId },
    include: {
      section: true,
    },
  });

  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  if (suggestion.status !== "pending") {
    return suggestion;
  }

  if (action === "accept") {
    if (!suggestion.content) {
      throw new Error("Suggestion missing content payload");
    }

    await prisma.$transaction(async (tx) => {
      const section = await tx.draftSection.findUnique({
        where: { id: suggestion.draftSectionId },
      });

      if (!section) {
        throw new Error("Draft section not found for suggestion");
      }

      await ensureDraftSectionVersion(tx, {
        id: section.id,
        version: section.version,
        status: section.status,
        content: section.content,
      });

      const updatedSection = await tx.draftSection.update({
        where: { id: suggestion.draftSectionId },
        data: {
          content: toInputJson(suggestion.content),
          version: section.version + 1,
          status: "draft",
        },
      });

      await recordDraftSectionVersion(tx, {
        id: updatedSection.id,
        version: updatedSection.version,
        status: updatedSection.status,
        content: updatedSection.content,
      });

      await tx.draftSuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: "accepted",
          resolvedAt: new Date(),
          resolvedBy: actor,
        },
      });
    });
  } else {
    await prisma.draftSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: "dismissed",
        resolvedAt: new Date(),
        resolvedBy: actor,
      },
    });
  }

  await logActivity({
    projectId: suggestion.projectId,
    actor,
    action: action === "accept" ? "draft.suggestion_accepted" : "draft.suggestion_dismissed",
    payload: {
      suggestionId: suggestion.id,
      draftSectionId: suggestion.draftSectionId,
      action,
    },
  });

  return prisma.draftSuggestion.findUnique({ where: { id: suggestion.id } });
}

function extractPrimaryParagraph(content: Prisma.JsonValue | null | undefined) {
  const doc = asJsonObject(content);
  if (!doc) {
    return "";
  }

  const nodes = Array.isArray((doc as Record<string, unknown>).content)
    ? ((doc as Record<string, unknown>).content as Array<Record<string, unknown>>)
    : [];

  for (const node of nodes) {
    if (node.type === "paragraph" && Array.isArray(node.content)) {
      const text = node.content
        .map((child) => (typeof child.text === "string" ? child.text : ""))
        .join(" ")
        .trim();
      if (text) {
        return text;
      }
    }
  }

  return "";
}

function appendParagraph(
  content: Prisma.JsonValue | null | undefined,
  document: { type: string; content: Array<Record<string, unknown>> },
) {
  const doc = asJsonObject(content);
  const baseDoc = doc ?? { type: "doc", content: [] };
  const currentContent = Array.isArray((baseDoc as Record<string, unknown>).content)
    ? ((baseDoc as Record<string, unknown>).content as Array<Record<string, unknown>>)
    : [];
  const newContent = Array.isArray(document.content) ? document.content : [];

  return {
    ...baseDoc,
    content: [...currentContent, ...newContent],
  };
}

function extractHeading(content: Prisma.JsonValue | null | undefined) {
  const doc = asJsonObject(content);
  if (!doc) {
    return "Draft Section";
  }

  const nodes = Array.isArray((doc as Record<string, unknown>).content)
    ? ((doc as Record<string, unknown>).content as Array<Record<string, unknown>>)
    : [];

  for (const node of nodes) {
    if (node.type === "heading" && Array.isArray(node.content)) {
      const text = node.content
        .map((child) => (typeof child.text === "string" ? child.text : ""))
        .join(" ")
        .trim();
      if (text) {
        return text;
      }
    }
  }

  return "Draft Section";
}

function asJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
