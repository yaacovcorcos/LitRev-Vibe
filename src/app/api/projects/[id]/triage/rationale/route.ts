import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { enqueueTriageRationaleJob } from "@/lib/ai/jobs";

const enqueueSchema = z.object({
  candidateIds: z.array(z.string()).optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = enqueueSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const job = await enqueueTriageRationaleJob({
    projectId: params.id,
    candidateIds: parsed.data.candidateIds,
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
