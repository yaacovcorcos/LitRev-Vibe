import { NextResponse } from "next/server";
import { z } from "zod";

import { composeJobInputSchema, enqueueComposeJob } from "@/lib/compose/jobs";
import { prisma } from "@/lib/prisma";

const composeRequestSchema = composeJobInputSchema
  .omit({ projectId: true })
  .extend({
    projectId: z.string().optional(),
  });

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = composeRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const job = await enqueueComposeJob({
    ...parsed.data,
    projectId: params.id,
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
