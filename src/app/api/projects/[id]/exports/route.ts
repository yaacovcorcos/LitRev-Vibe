import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { normalizeProjectSettings, exportFormats } from "@/lib/projects/settings";
import { enqueueExportJob } from "@/lib/export/jobs";
import { assertExportAllowed, ExportGuardError } from "@/lib/export/guards";
import { supportedExportFormats } from "@/lib/export/adapters";

const enqueueSchema = z.object({
  format: z.enum(exportFormats),
  includePrismaDiagram: z.boolean().optional(),
  includeLedger: z.boolean().optional(),
  actor: z.string().min(1).max(100).optional(),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      settings: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const settings = normalizeProjectSettings(project.settings);

  const json = await request.json().catch(() => ({}));
  const parsed = enqueueSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!settings.exports.enabledFormats.includes(parsed.data.format)) {
    return NextResponse.json({ error: "Format not enabled for this project" }, { status: 400 });
  }

  if (!supportedExportFormats().includes(parsed.data.format)) {
    return NextResponse.json({ error: `Export format ${parsed.data.format} is not supported yet.` }, { status: 400 });
  }

  const includePrismaDiagram = parsed.data.includePrismaDiagram ?? settings.exports.includePrismaDiagram;
  const includeLedger = parsed.data.includeLedger ?? settings.exports.includeLedgerExport;

  if (parsed.data.includeLedger === true && settings.exports.includeLedgerExport === false) {
    return NextResponse.json({ error: "Ledger export is disabled for this project" }, { status: 400 });
  }

  try {
    await assertExportAllowed(project.id, settings);
  } catch (error) {
    if (error instanceof ExportGuardError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  try {
    const result = await enqueueExportJob({
      projectId: project.id,
      format: parsed.data.format,
      includePrismaDiagram,
      includeLedger,
      actor: parsed.data.actor,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to enqueue export" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const parsed = listSchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const limit = parsed.data.limit ?? 20;

  const exportRecords = await prisma.export.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      job: {
        select: {
          id: true,
          status: true,
          progress: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    exports: exportRecords.map((record) => ({
      id: record.id,
      format: record.format,
      options: (record.options ?? {}) as Record<string, unknown>,
      status: record.status,
      storagePath: record.storagePath,
      storageUrl: record.storageUrl,
      jobId: record.jobId,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
      job: record.job ?? null,
      error: record.error,
    })),
  });
}
