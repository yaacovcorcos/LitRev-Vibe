import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { toInputJson } from "@/lib/prisma/json";

const locatorSchema = z
  .object({
    page: z.number().int().min(1, "Page must be a positive integer").optional(),
    paragraph: z.number().int().min(1, "Paragraph must be a positive integer").optional(),
    sentence: z.number().int().min(1, "Sentence must be a positive integer").optional(),
    note: z.string().trim().min(1, "Note cannot be empty").max(400, "Note is too long").optional(),
    quote: z.string().trim().min(1, "Quote cannot be empty").max(1000, "Quote is too long").optional(),
    source: z.string().trim().min(1, "Source cannot be empty").max(200, "Source is too long").optional(),
  })
  .refine(
    (value) =>
      value.page !== undefined ||
      value.paragraph !== undefined ||
      value.sentence !== undefined ||
      value.note !== undefined ||
      value.quote !== undefined,
    {
      message: "Provide at least one locator detail.",
    },
  );

const payloadSchema = z.object({
  locator: locatorSchema,
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
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingLocators = Array.isArray(entry.locators)
    ? (entry.locators as unknown[])
    : [];
  const updatedLocators = [...existingLocators, parsed.data.locator];

  const updated = await prisma.ledgerEntry.update({
    where: { id: entry.id },
    data: {
      locators: toInputJson(updatedLocators),
      verifiedByHuman: false,
    },
  });

  return NextResponse.json(updated);
}
