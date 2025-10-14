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

export async function GET(_request: Request, { params }: RouteParams) {
  const candidates = await prisma.candidate.findMany({
    where: { projectId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(candidates);
}
