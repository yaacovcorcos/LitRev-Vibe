import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";

const JSON_NULL = Prisma.JsonNull;

export const JOB_STATUSES = [
  "pending",
  "queued",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
] as const;

export type JobStatus = typeof JOB_STATUSES[number];

export type CreateJobInput = {
  projectId: string;
  jobType: string;
  status?: JobStatus;
  resumableState?: unknown;
  logs?: unknown;
  actor?: string;
  activityPayload?: unknown;
};

export async function createJobRecord({
  projectId,
  jobType,
  status = "queued",
  resumableState,
  logs,
  actor = "system",
  activityPayload,
}: CreateJobInput) {
  const job = await prisma.job.create({
    data: {
      projectId,
      jobType,
      status,
      resumableState: resumableState === undefined ? JSON_NULL : serializeToJson(resumableState),
      logs: logs === undefined ? JSON_NULL : serializeToJson(logs),
    },
  });

  await logActivity({
    projectId,
    actor,
    action: "job.enqueued",
    payload: {
      jobId: job.id,
      jobType,
      status: job.status,
      ...(activityPayload ? { metadata: activityPayload } : {}),
    },
  });

  return job;
}

export type UpdateJobInput = {
  jobId: string;
  status?: JobStatus;
  progress?: number;
  logs?: unknown;
  resumableState?: unknown;
  workerId?: string | null;
  completedAt?: Date | null;
};

export async function updateJobRecord({
  jobId,
  status,
  progress,
  logs,
  resumableState,
  workerId,
  completedAt,
}: UpdateJobInput) {
  const updates: Prisma.JobUpdateInput = {};

  if (status) {
    updates.status = status;
  }

  if (typeof progress === "number") {
    updates.progress = progress;
  }

  if (logs !== undefined) {
    updates.logs = serializeToJson(logs);
  }

  if (resumableState !== undefined) {
    updates.resumableState = serializeToJson(resumableState);
  }

  if (workerId !== undefined) {
    updates.workerId = workerId;
  }

  if (completedAt !== undefined) {
    updates.completedAt = completedAt;
  }

  return prisma.job.update({
    where: { id: jobId },
    data: updates,
  });
}

function serializeToJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}
