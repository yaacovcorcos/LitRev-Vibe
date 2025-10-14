import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const verifySchema = z.object({
  verified: z.boolean(),
});

type RouteParams = {
  params: {
    id: string;
    entryId: string;
  };
};

async function loadEntry(projectId: string, entryId: string) {
  const entry = await prisma.ledgerEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.projectId !== projectId) {
    return null;
  }

  return entry;
}

export async function POST(request: Request, { params }: RouteParams) {
  const entry = await loadEntry(params.id, params.entryId);
  if (!entry) {
    return NextResponse.json({ error: "Ledger entry not found" }, { status: 404 });
  }

  const json = await request.json();
  const parsed = verifySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.ledgerEntry.update({
    where: { id: entry.id },
    data: {
      verifiedByHuman: parsed.data.verified,
    },
  });

  return NextResponse.json(updated);
}
