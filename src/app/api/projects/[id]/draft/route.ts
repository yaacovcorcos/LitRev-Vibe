import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const sections = await prisma.draftSection.findMany({
    where: { projectId: project.id },
    orderBy: [
      { createdAt: "asc" },
    ],
    include: {
      citations: {
        include: {
          ledgerEntry: {
            select: {
              id: true,
              citationKey: true,
              verifiedByHuman: true,
            },
          },
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 5,
      },
    },
  });

  return NextResponse.json({
    sections: sections.map(({ citations, versions, ...section }) => ({
      ...section,
      ledgerEntries: citations.map((citation) => citation.ledgerEntry),
      versionHistory: versions.map(({ id, version, status, createdAt }) => ({
        id,
        version,
        status,
        createdAt,
      })),
    })),
  });
}
