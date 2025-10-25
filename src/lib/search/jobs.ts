import type { JobsOptions } from "bullmq";

import { z } from "zod";

import { Prisma } from "@/generated/prisma";
import { logActivity } from "@/lib/activity-log";
import { createJobRecord, updateJobRecord } from "@/lib/jobs";
import { queues } from "@/lib/queue/queue";
import { prisma } from "@/lib/prisma";
import { fetchUnpaywallBatch } from "@/lib/unpaywall";
import { searchAdapters, type SearchAdapter, type SearchQuery, type SearchResponse } from "@/lib/search";
import { enqueuePdfIngestJob } from "@/lib/search/pdf-ingest";

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

type PersistedCandidate = {
  id: string;
  externalId: string;
  adapterId: string;
  doi?: string;
  oaRecord: Record<string, unknown> | null;
  hasPdfArtifact: boolean;
};

async function persistResults(projectId: string, adapterId: string, response: SearchResponse) {
  if (response.results.length === 0) {
    return {
      stored: 0,
      candidates: [] as PersistedCandidate[],
    };
  }

  const dois = response.results
    .map((result) => (result.metadata?.doi as string | undefined) ?? undefined)
    .filter(Boolean) as string[];

  const unpaywallRecords = dois.length > 0 ? await fetchUnpaywallBatch(dois) : {};

  const candidates: PersistedCandidate[] = [];
  let stored = 0;

  for (const result of response.results) {
    const externalId = result.externalId;
    const doi = (result.metadata?.doi as string | undefined) ?? undefined;
    const oaRecord = doi ? (unpaywallRecords[doi] ?? null) : null;

    const existing = await prisma.candidate.findFirst({
      where: {
        projectId,
        searchAdapter: adapterId,
        externalIds: {
          path: ["externalId"],
          equals: externalId,
        },
      },
      select: {
        id: true,
        metadata: true,
        oaLinks: true,
      },
    });

    const mergedMetadata = buildCandidateMetadata(existing?.metadata, result);
    const metadataJson = sanitizeJson(mergedMetadata);
    const externalIdsJson = sanitizeJson({
      adapter: adapterId,
      externalId,
      doi,
    });
    const hasNewOaRecord = Boolean(oaRecord);
    const sanitizedOaLinks = hasNewOaRecord ? sanitizeJson(oaRecord) : null;

    let candidateId: string;
    let hasPdfArtifact = false;

    if (existing) {
      const updateData: Prisma.CandidateUpdateInput = {
        metadata: metadataJson,
        externalIds: externalIdsJson,
      };

      if (hasNewOaRecord) {
        updateData.oaLinks = sanitizedOaLinks ?? Prisma.JsonNull;
      }

      await prisma.candidate.update({
        where: { id: existing.id },
        data: updateData,
      });

      candidateId = existing.id;
      hasPdfArtifact = Boolean(mergedMetadata.pdf && typeof mergedMetadata.pdf === "object");
    } else {
      const createData: Prisma.CandidateCreateInput = {
        projectId,
        searchAdapter: adapterId,
        metadata: metadataJson,
        externalIds: externalIdsJson,
        oaLinks: hasNewOaRecord ? sanitizedOaLinks ?? Prisma.JsonNull : Prisma.JsonNull,
      };

      const created = await prisma.candidate.create({ data: createData });
      candidateId = created.id;
      stored += 1;
    }

    candidates.push({
      id: candidateId,
      externalId,
      adapterId,
      doi,
      oaRecord: oaRecord as Record<string, unknown> | null,
      hasPdfArtifact,
    });
  }

  return { stored, candidates };
}

export async function processSearchJob(data: unknown): Promise<SearchJobResult> {
  const payload = searchJobQueueSchema.parse(data);

  const adaptersToRun = payload.adapters ?? ["pubmed"];
  const adapterSummaries: Array<{ adapter: string; total: number; stored: number }> = [];

  let totalStored = 0;
  let totalResults = 0;

  const pendingPdfJobs: Promise<unknown>[] = [];

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

      const { stored, candidates } = await persistResults(payload.projectId, adapter.id, response);
      totalStored += stored;

      for (const candidate of candidates) {
        const oaLink = candidate.oaRecord && typeof candidate.oaRecord === "object"
          ? (candidate.oaRecord.bestOALink as string | undefined)
          : undefined;

        if (oaLink && !candidate.hasPdfArtifact) {
          pendingPdfJobs.push(
            enqueuePdfIngestJob({
              projectId: payload.projectId,
              candidateId: candidate.id,
              searchAdapter: adapter.id,
              externalId: candidate.externalId,
              url: oaLink,
              doi: candidate.doi ?? null,
            }).catch((error) => {
              console.warn("Failed to enqueue PDF ingest job", {
                candidateId: candidate.id,
                adapter: adapter.id,
                error,
              });
            }),
          );
        }
      }

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

    if (pendingPdfJobs.length > 0) {
      await Promise.all(pendingPdfJobs);
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

function asJsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function buildCandidateMetadata(existing: Prisma.JsonValue | null | undefined, result: SearchResponse["results"][number]) {
  const base = asJsonObject(existing) ?? {};
  return { ...base, ...(result as Record<string, unknown>) };
}
