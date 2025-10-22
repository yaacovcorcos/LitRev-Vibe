import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { inferContentType, resolveStoredExportPath } from "@/lib/export/storage";

type RouteParams = {
  params: {
    id: string;
    exportId: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const record = await prisma.export.findUnique({
    where: { id: params.exportId },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!record || record.projectId !== params.id) {
    return NextResponse.json({ error: "Export not found" }, { status: 404 });
  }

  if (!record.storagePath) {
    return NextResponse.json({ error: "Export artifact not available" }, { status: 404 });
  }

  const absolutePath = resolveStoredExportPath(record.storagePath);
  const storedExtension = path.extname(record.storagePath).toLowerCase();
  const ZIP_EXTENSION = ".zip";

  try {
    const buffer = await fs.readFile(absolutePath);
    const ext = path.extname(absolutePath) || `.${record.format}`;
    const projectName = record.project?.name?.trim() || `project-${record.projectId}`;
    const filename = `${slugify(projectName)}-${params.exportId}${ext}`;
    const contentType = storedExtension === ZIP_EXTENSION
      ? "application/zip"
      : inferContentType(record.format);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to read export artifact" }, { status: 500 });
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}
