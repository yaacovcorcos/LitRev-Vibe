import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const jobsQuerySchema = z.object({
  projectId: z.string().optional(),
  jobType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = jobsQuerySchema.safeParse({
    projectId: searchParams.get("projectId") ?? undefined,
    jobType: searchParams.get("jobType") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, jobType, limit = 25 } = parsed.data;

  const jobs = await prisma.job.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(jobType ? { jobType } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({ jobs });
}
