import JSZip from "jszip";

import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-log";
import { updateJobRecord } from "@/lib/jobs";
import { toInputJson } from "@/lib/prisma/json";
import { buildExportContext } from "@/lib/export/context";
import { getExportAdapter } from "@/lib/export/adapters";
import type { ExportArtifact } from "@/lib/export/storage";
import { storeExportArtifact } from "@/lib/export/storage";
import { exportJobQueueSchema, type ExportJobQueuePayload } from "@/lib/export/jobs";
import { buildPrismaDiagramSvg } from "@/lib/export/prisma-diagram";

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

    const primaryArtifact = await adapter.generate(context, {
      includePrismaDiagram: payload.includePrismaDiagram,
      includeLedger: payload.includeLedger,
    });

    const bundle = await buildExportArchive({
      context,
      payload,
      primaryArtifact,
    });

    const stored = await storeExportArtifact(payload.projectId, payload.exportId, {
      data: bundle.buffer,
      extension: "zip",
      contentType: "application/zip",
      filename: `${payload.exportId}.zip`,
    });

    await prisma.export.update({
      where: { id: payload.exportId },
      data: {
        status: "completed",
        storagePath: stored.storagePath,
        storageUrl: stored.storageUrl,
        completedAt: new Date(),
        error: Prisma.JsonNull,
        options: toInputJson({
          ...(bundle.manifest ?? {}),
        }),
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
        manifest: bundle.manifest,
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

type BuildArchiveInput = {
  context: Awaited<ReturnType<typeof buildExportContext>>;
  payload: ExportJobQueuePayload;
  primaryArtifact: ExportArtifact;
};

type ArchiveManifest = {
  format: string;
  generatedAt: string;
  includeLedger: boolean;
  includePrismaDiagram: boolean;
  files: Array<{ name: string; contentType: string }>;
};

export async function buildExportArchive({ context, payload, primaryArtifact }: BuildArchiveInput) {
  const zip = new JSZip();
  const files: Array<{ name: string; contentType: string; data: Buffer }> = [];

  const primaryName = filenameForFormat(payload.format, primaryArtifact.extension ?? payload.format);
  files.push({
    name: `manuscript/${primaryName}`,
    contentType: primaryArtifact.contentType,
    data: toBuffer(primaryArtifact.data),
  });

  if (payload.includeLedger) {
    const bibAdapter = getExportAdapter("bibtex");
    if (bibAdapter) {
      const bibliography = await bibAdapter.generate(context, {
        includeLedger: true,
        includePrismaDiagram: payload.includePrismaDiagram,
      });
      files.push({
        name: `attachments/bibliography.${bibliography.extension ?? "bib"}`,
        contentType: bibliography.contentType,
        data: toBuffer(bibliography.data),
      });
    }
  }

  if (payload.includePrismaDiagram) {
    const svg = buildPrismaDiagramSvg(context.metrics);
    files.push({
      name: "attachments/prisma-diagram.svg",
      contentType: "image/svg+xml",
      data: Buffer.from(svg, "utf-8"),
    });
  }

  const manifest: ArchiveManifest = {
    format: payload.format,
    generatedAt: context.generatedAt.toISOString(),
    includeLedger: payload.includeLedger,
    includePrismaDiagram: payload.includePrismaDiagram,
    files: files.map((file) => ({ name: file.name, contentType: file.contentType })),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  files.forEach((file) => {
    zip.file(file.name, file.data, {
      binary: true,
    });
  });

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return {
    buffer,
    manifest,
  };
}

function filenameForFormat(format: string, extension: string) {
  switch (format) {
    case "docx":
      return `manuscript.${extension}`;
    case "markdown":
      return `manuscript.${extension}`;
    case "bibtex":
      return `bibliography.${extension}`;
    default:
      return `export.${extension}`;
  }
}

function toBuffer(data: Buffer | Uint8Array | string) {
  return Buffer.from(data);
}
