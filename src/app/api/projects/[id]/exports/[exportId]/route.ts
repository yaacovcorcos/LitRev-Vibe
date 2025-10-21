import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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

  if (!record || record.projectId !== params.id) {
    return NextResponse.json({ error: "Export not found" }, { status: 404 });
  }

  return NextResponse.json({
    export: {
      id: record.id,
      projectId: record.projectId,
      format: record.format,
      status: record.status,
      options: (record.options ?? {}) as Record<string, unknown>,
      storagePath: record.storagePath,
      storageUrl: record.storageUrl,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
      error: record.error,
      job: record.job ?? null,
    },
  });
}
