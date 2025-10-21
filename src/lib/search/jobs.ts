import type { JobsOptions } from "bullmq";

import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { logActivity } from "@/lib/activity-log";
import { createJobRecord, updateJobRecord } from "@/lib/jobs";
import { queues } from "@/lib/queue/queue";
import { prisma } from "@/lib/prisma";
import { fetchUnpaywallBatch } from "@/lib/unpaywall";
import { searchAdapters, type SearchAdapter, type SearchQuery, type SearchResponse } from "@/lib/search";

function sanitizeJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

const searchJobInputSchema = z.object({
  projectId: z.string(),
  query: z.object({
    terms: z.string(),
    page: z.number().int().min(0).optional(),
    pageSize: z.number().int().min(1).optional(),
    since: z.string().optional(),
    until: z.string().optional(),
  }),
  adapters: z.array(z.string()).optional(),
});

const searchJobQueueSchema = searchJobInputSchema.extend({
  jobId: z.string(),
});

export type SearchJobInput = z.infer<typeof searchJobInputSchema>;
export type SearchJobQueuePayload = z.infer<typeof searchJobQueueSchema>;
export const searchJobSchema = searchJobQueueSchema;

export const SEARCH_JOB_TYPE = "search.execute" as const;

export type SearchJobResult = {
  inserted: number;
  totalResults: number;
  adapterSummaries: Array<{ adapter: string; total: number; stored: number }>;
};

export function findAdapterById(id: string): SearchAdapter | undefined {
  return searchAdapters.find((adapter) => adapter.id === id);
}

export async function enqueueSearchJob(input: SearchJobInput, options?: JobsOptions) {
  const payload = searchJobInputSchema.parse(input);
  const adapters = payload.adapters ?? ["pubmed"];

  const jobRecord = await createJobRecord({
    projectId: payload.projectId,
    jobType: SEARCH_JOB_TYPE,
    status: "queued",
    logs: {
      query: payload.query,
      adapters,
    },
    activityPayload: {
      query: payload.query,
      adapters,
    },
  });

  const queuePayload = searchJobQueueSchema.parse({
    ...payload,
    jobId: jobRecord.id,
  });

  try {
    await queues.default.add("search:execute", queuePayload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: false,
      removeOnFail: false,
      jobId: jobRecord.id,
      ...options,
    });
  } catch (error) {
    await updateJobRecord({
      jobId: jobRecord.id,
      status: "failed",
      logs: {
        message: "Failed to enqueue search job",
        error: error instanceof Error ? error.message : String(error),
      },
      completedAt: new Date(),
    });
    throw error;
  }

  return jobRecord;
}

async function persistResults(projectId: string, adapterId: string, response: SearchResponse) {
  if (response.results.length === 0) {
    return 0;
  }

  const dois = response.results
    .map((result) => (result.metadata?.doi as string | undefined) ?? undefined)
    .filter(Boolean) as string[];

  const unpaywallRecords = dois.length > 0 ? await fetchUnpaywallBatch(dois) : {};

  const payloads = response.results.map((result) => {
    const doi = (result.metadata?.doi as string | undefined) ?? undefined;
    const oaRecord = doi ? unpaywallRecords[doi] ?? null : null;

    return {
      projectId,
      searchAdapter: adapterId,
      externalIds: sanitizeJson({
        adapter: adapterId,
        externalId: result.externalId,
        doi,
      }),
      metadata: sanitizeJson(result),
      oaLinks: sanitizeJson(oaRecord),
    };
  });

  const { count } = await prisma.candidate.createMany({ data: payloads });
  return count;
}

export async function processSearchJob(data: unknown): Promise<SearchJobResult> {
  const payload = searchJobQueueSchema.parse(data);

  const adaptersToRun = payload.adapters ?? ["pubmed"];
  const adapterSummaries: Array<{ adapter: string; total: number; stored: number }> = [];

  let totalStored = 0;
  let totalResults = 0;

  const totalAdapters = adaptersToRun.length || 1;

  await updateJobRecord({
    jobId: payload.jobId,
    status: "in_progress",
    progress: 0,
  }).catch(() => undefined);

  try {
    for (let index = 0; index < adaptersToRun.length; index += 1) {
      const adapterId = adaptersToRun[index];
      const adapter = findAdapterById(adapterId);
      if (!adapter) {
        console.warn(`Search adapter not found: ${adapterId}`);
        continue;
      }

      const response = await adapter.search(payload.query);
      totalResults += response.results.length;
      const stored = await persistResults(payload.projectId, adapter.id, response);
      totalStored += stored;

      adapterSummaries.push({ adapter: adapter.id, total: response.results.length, stored });

      const progress = Math.min(1, (index + 1) / totalAdapters);
      await updateJobRecord({
        jobId: payload.jobId,
        status: "in_progress",
        progress,
        logs: {
          query: payload.query,
          adapters: adapterSummaries,
          totals: {
            totalResults,
            inserted: totalStored,
          },
        },
      }).catch(() => undefined);
    }

    const result: SearchJobResult = {
      inserted: totalStored,
      totalResults,
      adapterSummaries,
    };

    await updateJobRecord({
      jobId: payload.jobId,
      status: "completed",
      progress: 1,
      logs: {
        query: payload.query,
        adapters: adapterSummaries,
        totals: {
          totalResults,
          inserted: totalStored,
        },
      },
      completedAt: new Date(),
    }).catch(() => undefined);

    await logActivity({
      projectId: payload.projectId,
      action: "search.completed",
      payload: {
        jobId: payload.jobId,
        totals: {
          totalResults,
          inserted: totalStored,
        },
        adapters: adapterSummaries,
      },
    }).catch(() => undefined);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await updateJobRecord({
      jobId: payload.jobId,
      status: "failed",
      logs: {
        query: payload.query,
        adapters: adapterSummaries,
        totals: {
          totalResults,
          inserted: totalStored,
        },
        error: message,
      },
      completedAt: new Date(),
    }).catch(() => undefined);

    await logActivity({
      projectId: payload.projectId,
      action: "search.failed",
      payload: {
        jobId: payload.jobId,
        error: message,
      },
    }).catch(() => undefined);

    throw error;
  }
}
