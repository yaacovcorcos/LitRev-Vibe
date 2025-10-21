import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { updateJobRecord } from "@/lib/jobs";
import { toInputJson } from "@/lib/prisma/json";
import { buildExportContext } from "@/lib/export/context";
import { getExportAdapter } from "@/lib/export/adapters";
import { storeExportArtifact } from "@/lib/export/storage";
import { exportJobQueueSchema, type ExportJobQueuePayload } from "@/lib/export/jobs";

export async function processExportJob(data: unknown) {
  const payload = exportJobQueueSchema.parse(data);

  await Promise.all([
    updateJobRecord({
      jobId: payload.jobId,
      status: "in_progress",
      progress: 0,
    }).catch(() => undefined),
    prisma.export.update({
      where: { id: payload.exportId },
      data: {
        status: "in_progress",
      },
    }).catch(() => undefined),
  ]);

  try {
    const context = await buildExportContext(payload.projectId);
    const adapter = getExportAdapter(payload.format);

    if (!adapter) {
      throw new Error(`No export adapter registered for format ${payload.format}`);
    }

    const artifact = await adapter.generate(context, {
      includePrismaDiagram: payload.includePrismaDiagram,
      includeLedger: payload.includeLedger,
    });

    const stored = await storeExportArtifact(payload.projectId, payload.exportId, artifact);

    await prisma.export.update({
      where: { id: payload.exportId },
      data: {
        status: "completed",
        storagePath: stored.storagePath,
        storageUrl: stored.storageUrl,
        completedAt: new Date(),
        error: Prisma.JsonNull,
      },
    });

    await updateJobRecord({
      jobId: payload.jobId,
      status: "completed",
      progress: 1,
      logs: {
        format: payload.format,
        includePrismaDiagram: payload.includePrismaDiagram,
        includeLedger: payload.includeLedger,
        storagePath: stored.storagePath,
      },
      completedAt: new Date(),
    }).catch(() => undefined);

    await logActivity({
      projectId: payload.projectId,
      action: "export.completed",
      payload: {
        exportId: payload.exportId,
        format: payload.format,
        storagePath: stored.storagePath,
      },
    });

    return {
      exportId: payload.exportId,
      storagePath: stored.storagePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await Promise.all([
      prisma.export.update({
        where: { id: payload.exportId },
        data: {
          status: "failed",
          error: toInputJson({ message }),
        },
      }).catch(() => undefined),
      updateJobRecord({
        jobId: payload.jobId,
        status: "failed",
        logs: {
          format: payload.format,
          includePrismaDiagram: payload.includePrismaDiagram,
          includeLedger: payload.includeLedger,
          error: message,
        },
        completedAt: new Date(),
      }).catch(() => undefined),
      logActivity({
        projectId: payload.projectId,
        action: "export.failed",
        payload: {
          exportId: payload.exportId,
          error: message,
        },
      }).catch(() => undefined),
    ]);

    throw error;
  }
}
