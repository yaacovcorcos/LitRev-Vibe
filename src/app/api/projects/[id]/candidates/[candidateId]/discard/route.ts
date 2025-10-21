import { NextResponse } from "next/server";
import { z } from "zod";

import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { sanitizeTriageStatus } from "@/lib/triage/status";

const discardSchema = z
  .object({
    reason: z.string().trim().min(1).max(400).optional(),
    note: z.string().trim().min(1).max(400).optional(),
  })
  .optional();

type RouteParams = {
  params: {
    id: string;
    candidateId: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.candidateId },
  });

  if (!candidate || candidate.projectId !== params.id) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const json = await request.json().catch(() => undefined);
  const parsed = discardSchema.safeParse(json ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const previousStatus = sanitizeTriageStatus(candidate.triageStatus);

  const updated = await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      triageStatus: "discarded",
    },
  });

  await logActivity({
    projectId: candidate.projectId,
    action: "triage.discarded",
    actor: "system",
    payload: {
      candidateId: candidate.id,
      previousStatus,
      reason: parsed.success ? parsed.data?.reason ?? null : null,
      note: parsed.success ? parsed.data?.note ?? null : null,
    },
  });

  return NextResponse.json(updated);
}
