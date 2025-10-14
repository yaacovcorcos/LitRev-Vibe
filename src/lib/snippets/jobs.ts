import { queues } from "@/lib/queue/queue";
import { extractLocatorSnippets } from "@/lib/snippets/extractor";

export type SnippetJobData = {
  projectId: string;
  candidateIds?: string[];
};

export type SnippetJobResult = {
  processed: number;
  totalCandidates: number;
};

export async function enqueueSnippetExtractionJob(data: SnippetJobData) {
  return queues.default.add("snippets:extract", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function processSnippetExtractionJob(data: unknown): Promise<SnippetJobResult> {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid snippet job payload");
  }

  const { projectId, candidateIds } = data as SnippetJobData;
  if (!projectId) {
    throw new Error("projectId is required");
  }

  const results = await extractLocatorSnippets({ projectId, candidateIds });

  return {
    processed: results.length,
    totalCandidates: results.length,
  } satisfies SnippetJobResult;
}
