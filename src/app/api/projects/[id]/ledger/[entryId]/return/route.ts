import { NextResponse } from "next/server";
import { z } from "zod";

import { logActivity } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";
import { sanitizeTriageStatus } from "@/lib/triage/status";

const returnSchema = z.object({
  status: z.enum(["pending", "needs_review"]),
  note: z.string().trim().min(1).max(400).optional(),
  reason: z.string().trim().min(1).max(400).optional(),
});

type RouteParams = {
  params: {
    id: string;
    entryId: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const entry = await prisma.ledgerEntry.findUnique({
    where: { id: params.entryId },
  });

  if (!entry || entry.projectId !== params.id) {
    return NextResponse.json({ error: "Ledger entry not found" }, { status: 404 });
  }

  if (!entry.candidateId) {
    return NextResponse.json({ error: "Ledger entry is not linked to a candidate" }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: entry.candidateId },
  });

  if (!candidate || candidate.projectId !== params.id) {
    return NextResponse.json({ error: "Linked candidate not found" }, { status: 404 });
  }

  const json = await request.json().catch(() => undefined);
  const parsed = returnSchema.safeParse(json ?? {});

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const targetStatus = parsed.data.status;
  const previousStatus = sanitizeTriageStatus(candidate.triageStatus);

  await prisma.$transaction([
    prisma.ledgerEntry.delete({
      where: { id: entry.id },
    }),
    prisma.candidate.update({
      where: { id: candidate.id },
      data: { triageStatus: targetStatus },
    }),
  ]);

  await logActivity({
    projectId: candidate.projectId,
    action: "ledger.returned",
    actor: "system",
    payload: {
      ledgerEntryId: entry.id,
      candidateId: candidate.id,
      previousStatus,
      targetStatus,
      note: parsed.data.note ?? null,
      reason: parsed.data.reason ?? null,
    },
  });

  await logActivity({
    projectId: candidate.projectId,
    action: "triage.returned",
    actor: "system",
    payload: {
      candidateId: candidate.id,
      previousStatus,
      targetStatus,
      note: parsed.data.note ?? null,
      reason: parsed.data.reason ?? null,
    },
  });

  return NextResponse.json({
    candidateId: candidate.id,
    status: targetStatus,
  });
}
