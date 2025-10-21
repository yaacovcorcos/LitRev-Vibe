import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { toInputJson, toNullableInputJson } from "@/lib/prisma/json";
import { logActivity } from "@/lib/activity-log";

const locatorSchema = z
  .object({
    page: z.number().int().min(1, "Page must be a positive integer").optional(),
    paragraph: z.number().int().min(1, "Paragraph must be a positive integer").optional(),
    sentence: z.number().int().min(1, "Sentence must be a positive integer").optional(),
    note: z.string().trim().min(1, "Note cannot be empty").max(400, "Note is too long").optional(),
    quote: z.string().trim().min(1, "Quote cannot be empty").max(1000, "Quote is too long").optional(),
    source: z.string().trim().min(1, "Source cannot be empty").max(200, "Source is too long").optional(),
  })
  .refine(
    (value) =>
      value.page !== undefined ||
      value.paragraph !== undefined ||
      value.sentence !== undefined ||
      value.note !== undefined ||
      value.quote !== undefined,
    {
      message: "Provide at least one locator detail.",
    },
  );

const keepSchema = z.object({
  locator: locatorSchema,
});

type RouteParams = {
  params: {
    id: string;
    candidateId: string;
  };
};

async function loadCandidate(projectId: string, candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate || candidate.projectId !== projectId) {
    return null;
  }

  return candidate;
}

function deriveCitationKey(candidate: { metadata: Record<string, unknown>; id: string }) {
  const metadataKey = candidate.metadata?.citationKey;
  if (typeof metadataKey === "string" && metadataKey.trim()) {
    return metadataKey;
  }

  const title = candidate.metadata?.title;
  if (typeof title === "string" && title.trim()) {
    return title.slice(0, 80);
  }

  return candidate.id;
}

export async function POST(request: Request, { params }: RouteParams) {
  const candidate = await loadCandidate(params.id, params.candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const json = await request.json();
  const parsed = keepSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const citationKey = deriveCitationKey({ id: candidate.id, metadata: candidate.metadata as Record<string, unknown> });

  const ledgerEntry = await prisma.ledgerEntry.create({
    data: {
      projectId: candidate.projectId,
      candidateId: candidate.id,
      citationKey,
      metadata: toInputJson(candidate.metadata),
      provenance: toInputJson({
        source: "search-triage",
        searchAdapter: candidate.searchAdapter,
        externalIds: candidate.externalIds,
      }),
      locators: toInputJson([parsed.data.locator]),
      integrityNotes: toNullableInputJson(candidate.integrityFlags),
      importedFrom: candidate.searchAdapter,
      keptAt: new Date(),
    },
  });

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      triageStatus: "kept",
    },
  });

  await logActivity({
    projectId: candidate.projectId,
    action: "ledger.keep",
    actor: "system",
    payload: {
      candidateId: candidate.id,
      ledgerEntryId: ledgerEntry.id,
      locator: parsed.data.locator,
    },
  });

  return NextResponse.json(ledgerEntry, { status: 201 });
}
