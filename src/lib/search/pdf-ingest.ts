import pdfParse from "pdf-parse";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { queues } from "@/lib/queue/queue";
import { storeCandidatePdf } from "@/lib/storage/pdf";
import { extractLocatorSnippets } from "@/lib/snippets/extractor";

export const PDF_INGEST_JOB_NAME = "pdf:ingest" as const;

const pdfIngestJobSchema = z.object({
  projectId: z.string(),
  candidateId: z.string().optional(),
  searchAdapter: z.string(),
  externalId: z.string(),
  url: z.string().url(),
  doi: z.string().optional().nullable(),
});

export type PdfIngestJobData = z.infer<typeof pdfIngestJobSchema>;

export async function enqueuePdfIngestJob(data: PdfIngestJobData) {
  const payload = pdfIngestJobSchema.parse(data);

  return queues.default.add(PDF_INGEST_JOB_NAME, payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

type CandidateRecord = {
  id: string;
  projectId: string;
  metadata: Record<string, unknown>;
};

function ensureCandidateMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

export async function processPdfIngestJob(data: unknown) {
  const payload = pdfIngestJobSchema.parse(data);

  const candidate = await resolveCandidate(payload);

  if (!candidate) {
    throw new Error(`Candidate not found for project ${payload.projectId} (${payload.externalId})`);
  }

  const response = await fetchPdf(payload.url);
  const buffer = Buffer.from(await response.arrayBuffer());

  const stored = await storeCandidatePdf(candidate.projectId, candidate.id, buffer);

  let parsedText = "";
  try {
    const parsed = await pdfParse(buffer);
    parsedText = typeof parsed.text === "string" ? parsed.text : "";
  } catch (error) {
    console.warn("Failed to parse PDF for candidate", candidate.id, error);
  }

  const metadata = ensureCandidateMetadata(candidate.metadata);
  metadata.pdf = {
    storagePath: stored.storagePath,
    storageUrl: stored.storageUrl,
    sourceUrl: payload.url,
    downloadedAt: new Date().toISOString(),
    doi: payload.doi ?? null,
  };

  if (parsedText.trim()) {
    metadata.pdfText = truncateText(parsedText, 50_000);
  }

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      metadata,
    },
  });

  await extractLocatorSnippets({ projectId: candidate.projectId, candidateIds: [candidate.id] }).catch((error) => {
    console.warn("Snippet extraction failed after PDF ingest", candidate.id, error);
  });

  return {
    candidateId: candidate.id,
    storagePath: stored.storagePath,
    snippetSource: parsedText.trim() ? "pdf" : "fallback",
  };
}

async function resolveCandidate(payload: PdfIngestJobData): Promise<CandidateRecord | null> {
  if (payload.candidateId) {
    const record = await prisma.candidate.findUnique({
      where: { id: payload.candidateId },
      select: {
        id: true,
        projectId: true,
        metadata: true,
      },
    });

    if (record) {
      return {
        id: record.id,
        projectId: record.projectId,
        metadata: ensureCandidateMetadata(record.metadata),
      };
    }
  }

  const record = await prisma.candidate.findFirst({
    where: {
      projectId: payload.projectId,
      searchAdapter: payload.searchAdapter,
      externalIds: {
        path: ["externalId"],
        equals: payload.externalId,
      },
    },
    select: {
      id: true,
      projectId: true,
      metadata: true,
    },
  });

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    projectId: record.projectId,
    metadata: ensureCandidateMetadata(record.metadata),
  };
}

async function fetchPdf(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/pdf",
      "User-Agent": "LitRev-Vibe/0.1 (https://github.com/yaacovcorcos/LitRev-Vibe)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF (${response.status})`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.toLowerCase().includes("pdf")) {
    throw new Error(`Expected PDF content type, received ${contentType}`);
  }

  return response;
}

function truncateText(text: string, limit: number) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}…`;
}
