import { NextResponse } from "next/server";
import { z } from "zod";

import { enqueueSearchJob } from "@/lib/search/jobs";
import { prisma } from "@/lib/prisma";

const searchRequestSchema = z.object({
  query: z.object({
    terms: z.string().min(1, "Query terms are required"),
    page: z.number().int().min(0).optional(),
    pageSize: z.number().int().min(1).max(200).optional(),
    since: z.string().optional(),
    until: z.string().optional(),
  }),
  adapters: z.array(z.string()).optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = searchRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const job = await enqueueSearchJob({
    projectId: params.id,
    query: parsed.data.query,
    adapters: parsed.data.adapters,
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
  const statusParam = searchParams.get('status');
  const statuses = statusParam
    ? statusParam.split(',').map((value) => value.trim()).filter(Boolean)
    : ['pending'];

  const whereClause = {
    projectId: params.id,
    ...(statuses.length > 0 ? { triageStatus: { in: statuses } } : {}),
  };

  const [candidates, total] = await prisma.$transaction([
    prisma.candidate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: page * pageSize,
    }),
    prisma.candidate.count({
      where: whereClause,
    }),
  ]);

  return NextResponse.json({
    candidates,
    total,
    page,
    pageSize,
  });
}
