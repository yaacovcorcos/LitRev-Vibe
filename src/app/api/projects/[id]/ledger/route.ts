import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: {
    id: string;
  };
};

function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  return { page, pageSize };
}

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const { page, pageSize } = parsePagination(searchParams);

  const [entries, total] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where: { projectId: params.id },
      orderBy: { keptAt: "desc" },
      take: pageSize,
      skip: page * pageSize,
    }),
    prisma.ledgerEntry.count({
      where: { projectId: params.id },
    }),
  ]);

  return NextResponse.json({
    entries,
    total,
    page,
    pageSize,
  });
}
