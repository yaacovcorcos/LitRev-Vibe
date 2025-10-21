import type { JobsOptions } from "bullmq";
import { z } from "zod";

import type { ExportStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { createJobRecord, updateJobRecord } from "@/lib/jobs";
import { queues } from "@/lib/queue/queue";
import { toInputJson } from "@/lib/prisma/json";
import { logActivity } from "@/lib/activity-log";
import { exportFormats, type ExportFormat } from "@/lib/projects/settings";
import { getExportAdapter } from "@/lib/export/adapters";

export const exportJobInputSchema = z.object({
  projectId: z.string(),
  format: z.enum(exportFormats),
  includePrismaDiagram: z.boolean(),
  includeLedger: z.boolean(),
  actor: z.string().min(1).optional(),
});

export const exportJobQueueSchema = exportJobInputSchema.extend({
  jobId: z.string(),
  exportId: z.string(),
});

export type ExportJobInput = z.infer<typeof exportJobInputSchema>;
export type ExportJobQueuePayload = z.infer<typeof exportJobQueueSchema>;

export const EXPORT_QUEUE_JOB_NAME = "export:generate" as const;
export const EXPORT_JOB_TYPE = "export.generate" as const;

export async function enqueueExportJob(input: ExportJobInput, options?: JobsOptions) {
  const payload = exportJobInputSchema.parse(input);

  if (!getExportAdapter(payload.format)) {
    throw new Error(`Export format ${payload.format} is not currently supported.`);
  }

  const jobRecord = await createJobRecord({
    projectId: payload.projectId,
    jobType: EXPORT_JOB_TYPE,
    status: "queued",
    logs: {
      format: payload.format,
      includePrismaDiagram: payload.includePrismaDiagram,
      includeLedger: payload.includeLedger,
    },
    actor: payload.actor,
    activityPayload: {
      format: payload.format,
      includePrismaDiagram: payload.includePrismaDiagram,
      includeLedger: payload.includeLedger,
    },
  });

  let exportRecordId: string | null = null;

  try {
    const exportRecord = await prisma.export.create({
      data: {
        projectId: payload.projectId,
        format: payload.format,
        options: toInputJson({
          includePrismaDiagram: payload.includePrismaDiagram,
          includeLedger: payload.includeLedger,
        }),
        status: "queued" as ExportStatus,
        jobId: jobRecord.id,
        createdBy: payload.actor ?? "system",
      },
    });

    exportRecordId = exportRecord.id;

    const queuePayload = exportJobQueueSchema.parse({
      ...payload,
      jobId: jobRecord.id,
      exportId: exportRecord.id,
    });

    await queues.default.add(EXPORT_QUEUE_JOB_NAME, queuePayload, {
      attempts: 2,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: false,
      removeOnFail: false,
      jobId: jobRecord.id,
      ...(options ?? {}),
    });

    await logActivity({
      projectId: payload.projectId,
      action: "export.enqueued",
      actor: payload.actor ?? "system",
      payload: {
        exportId: exportRecord.id,
        format: payload.format,
      },
    });

    return {
      jobId: jobRecord.id,
      exportId: exportRecord.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await updateJobRecord({
      jobId: jobRecord.id,
      status: "failed",
      logs: {
        format: payload.format,
        includePrismaDiagram: payload.includePrismaDiagram,
        includeLedger: payload.includeLedger,
        error: message,
      },
      completedAt: new Date(),
    }).catch(() => undefined);

    if (exportRecordId) {
      await prisma.export.update({
        where: { id: exportRecordId },
        data: {
          status: "failed" as ExportStatus,
          error: toInputJson({ message }),
        },
      }).catch(() => undefined);
    }

    throw error;
  }
}

export type EnqueuedExport = Awaited<ReturnType<typeof enqueueExportJob>>;
