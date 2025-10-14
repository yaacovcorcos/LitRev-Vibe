import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

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

  const ledgerSummary = section.citations
    .filter((citation) => citation.ledgerEntry.verifiedByHuman)
    .map((citation) => citation.ledgerEntry.citationKey)
    .slice(0, 3);

  const summaryBase = ledgerSummary.length > 0
    ? `Incorporate evidence from ${ledgerSummary.join(", ")}.`
    : "Expand the section with additional context sourced from verified evidence.";

  const sectionText = extractPrimaryParagraph(section.content);
  const improvement = buildImprovedParagraph(sectionText, data.narrativeVoice);

  const updatedContent = appendParagraph(section.content, improvement);

  const diffPayload = {
    type: "append_paragraph",
    before: sectionText,
    after: improvement,
  } satisfies SuggestionDiff;

  const suggestion = await prisma.draftSuggestion.create({
    data: {
      projectId: section.projectId,
      draftSectionId: section.id,
      suggestionType: data.suggestionType,
      summary: summaryBase,
      diff: toJson(diffPayload),
      content: toJson(updatedContent),
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
      await tx.draftSection.update({
        where: { id: suggestion.draftSectionId },
        data: {
          content: suggestion.content,
          version: suggestion.section.version + 1,
          status: "draft",
        },
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

function buildImprovedParagraph(base: string, voice: CreateSuggestionInput["narrativeVoice"]) {
  const voicePrefix = voice === "confident"
    ? "The evidence strongly suggests that"
    : voice === "cautious"
      ? "The available evidence indicates that"
      : "This section can clarify that";

  const trimmed = base.trim();
  if (!trimmed) {
    return `${voicePrefix} the literature supports a deeper exploration of study design and outcomes.`;
  }

  return `${voicePrefix} ${trimmed} Additionally, highlight nuanced findings and contextual factors across the cited studies.`;
}

function appendParagraph(content: Prisma.JsonValue | null | undefined, paragraph: string) {
  const doc = asJsonObject(content);
  const baseDoc = doc ?? { type: "doc", content: [] };
  const currentContent = Array.isArray((baseDoc as Record<string, unknown>).content)
    ? ((baseDoc as Record<string, unknown>).content as Array<Record<string, unknown>>)
    : [];

  return {
    ...baseDoc,
    content: [
      ...currentContent,
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: paragraph,
          },
        ],
      },
    ],
  };
}

function toJson<T>(value: T) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.JsonValue;
}

function asJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
