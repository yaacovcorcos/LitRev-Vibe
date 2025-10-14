import type { JobsOptions } from "bullmq";

import { queues } from "@/lib/queue/queue";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { fetchUnpaywallBatch } from "@/lib/unpaywall";
import { searchAdapters, type SearchAdapter, type SearchQuery, type SearchResponse } from "@/lib/search";

export type SearchJobData = {
  projectId: string;
  query: SearchQuery;
  adapters?: string[];
};

export type SearchJobResult = {
  inserted: number;
  totalResults: number;
  adapterSummaries: Array<{ adapter: string; total: number; stored: number }>;
};

export function findAdapterById(id: string): SearchAdapter | undefined {
  return searchAdapters.find((adapter) => adapter.id === id);
}

export async function enqueueSearchJob(data: SearchJobData, options?: JobsOptions) {
  return queues.default.add("search:execute", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    removeOnComplete: true,
    removeOnFail: false,
    ...options,
  });
}

async function persistResults(projectId: string, adapterId: string, response: SearchResponse) {
  let stored = 0;

  const dois = response.results
    .map((result) => (result.metadata?.doi as string | undefined) ?? undefined)
    .filter(Boolean) as string[];

  const unpaywallRecords = dois.length > 0 ? await fetchUnpaywallBatch(dois) : {};

  for (const result of response.results) {
    const doi = (result.metadata?.doi as string | undefined) ?? undefined;
    const oaRecord = doi ? unpaywallRecords[doi] ?? null : null;

    await prisma.candidate.create({
      data: {
        projectId,
        searchAdapter: adapterId,
        externalIds: {
          adapter: adapterId,
          externalId: result.externalId,
          doi,
        } satisfies Prisma.InputJsonValue,
        metadata: result as Prisma.InputJsonValue,
        oaLinks: oaRecord ? (oaRecord as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    stored += 1;
  }

  return stored;
}

export async function processSearchJob(data: SearchJobData): Promise<SearchJobResult> {
  const adaptersToRun = data.adapters ?? ["pubmed"];
  const adapterSummaries: Array<{ adapter: string; total: number; stored: number }> = [];

  let totalStored = 0;
  let totalResults = 0;

  for (const adapterId of adaptersToRun) {
    const adapter = findAdapterById(adapterId);
    if (!adapter) {
      console.warn(`Search adapter not found: ${adapterId}`);
      continue;
    }

    const response = await adapter.search(data.query);
    totalResults += response.results.length;
    const stored = await persistResults(data.projectId, adapter.id, response);
    totalStored += stored;

    adapterSummaries.push({ adapter: adapter.id, total: response.results.length, stored });
  }

  return {
    inserted: totalStored,
    totalResults,
    adapterSummaries,
  } satisfies SearchJobResult;
}
