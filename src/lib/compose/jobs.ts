import type { JobsOptions } from "bullmq";
import { z } from "zod";

import { queues } from "@/lib/queue/queue";
import { createJobRecord, updateJobRecord } from "@/lib/jobs";

const SECTION_TYPES = [
  "literature_review",
  "introduction",
  "methods",
  "results",
  "discussion",
  "conclusion",
  "custom",
] as const;

const SECTION_STATUSES = ["pending", "running", "completed", "failed"] as const;

export type ComposeSectionType = typeof SECTION_TYPES[number];
export type ComposeSectionStatus = typeof SECTION_STATUSES[number];

export const composeJobSectionSchema = z.object({
  sectionId: z.string().optional(),
  sectionType: z.enum(SECTION_TYPES),
  title: z.string().min(1, "Section title is required").optional(),
  instructions: z.string().optional(),
  outline: z.array(z.string().min(1)).max(12).optional(),
  ledgerEntryIds: z.array(z.string()).min(1, "At least one ledger entry is required"),
  targetWordCount: z.number().int().min(100).max(4000).optional(),
});

export const composeJobInputSchema = z.object({
  projectId: z.string(),
  mode: z.literal("literature_review"),
  sections: z.array(composeJobSectionSchema).min(1),
  researchQuestion: z.string().optional(),
  narrativeVoice: z.enum(["neutral", "confident", "cautious"]).optional(),
  requestId: z.string().optional(),
});

export type ComposeJobInput = z.infer<typeof composeJobInputSchema>;

export const composeJobSectionStateSchema = z.object({
  key: z.string(),
  sectionType: z.enum(SECTION_TYPES),
  ledgerEntryIds: z.array(z.string()).min(1),
  status: z.enum(SECTION_STATUSES),
  attempts: z.number().int().min(0),
  draftSectionId: z.string().optional(),
  lastUpdatedAt: z.string().datetime().optional(),
  lastError: z.string().optional(),
});

export const composeJobStateSchema = z.object({
  currentSectionIndex: z.number().int().min(0).optional(),
  sections: z.array(composeJobSectionStateSchema),
});

export type ComposeJobState = z.infer<typeof composeJobStateSchema>;

export const composeJobQueuePayloadSchema = composeJobInputSchema.extend({
  jobId: z.string(),
  state: composeJobStateSchema,
});

export type ComposeJobQueuePayload = z.infer<typeof composeJobQueuePayloadSchema>;

export const COMPOSE_QUEUE_JOB_NAME = "compose:literature-review";
export const COMPOSE_JOB_TYPE = "compose.literature_review";

export async function enqueueComposeJob(input: ComposeJobInput, options?: JobsOptions) {
  const payload = composeJobInputSchema.parse(input);
  const initialState = buildInitialState(payload);

  const jobRecord = await createJobRecord({
    projectId: payload.projectId,
    jobType: COMPOSE_JOB_TYPE,
    status: "queued",
    resumableState: initialState,
    logs: {
      mode: payload.mode,
      requestId: payload.requestId ?? null,
    },
    activityPayload: {
      mode: payload.mode,
      sectionCount: payload.sections.length,
    },
  });

  const queuePayload: ComposeJobQueuePayload = composeJobQueuePayloadSchema.parse({
    ...payload,
    jobId: jobRecord.id,
    state: initialState,
  });

  try {
    await queues.default.add(
      COMPOSE_QUEUE_JOB_NAME,
      queuePayload,
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 1_000 },
        removeOnComplete: false,
        removeOnFail: false,
        ...(options ?? {}),
        jobId: jobRecord.id,
      },
    );
  } catch (error) {
    await updateJobRecord({
      jobId: jobRecord.id,
      status: "failed",
      logs: {
        message: "Failed to enqueue compose job",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  return jobRecord;
}

export function buildInitialState(input: ComposeJobInput): ComposeJobState {
  return composeJobStateSchema.parse({
    currentSectionIndex: 0,
    sections: input.sections.map((section, index) => ({
      key: section.sectionId ?? createSectionKey(section.sectionType, index),
      sectionType: section.sectionType,
      ledgerEntryIds: section.ledgerEntryIds,
      status: "pending",
      attempts: 0,
      draftSectionId: section.sectionId,
    })),
  });
}

function createSectionKey(sectionType: ComposeSectionType, index: number) {
  return `${sectionType}-${index + 1}`;
}
