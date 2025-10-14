import { NextResponse } from "next/server";
import { z } from "zod";

import { listActivity, logActivity } from "@/lib/activity-log";

type RouteParams = {
  params: {
    id: string;
  };
};

const logInputSchema = z.object({
  actor: z.string().optional(),
  action: z.string().min(1, "Action is required"),
  payload: z.any().optional(),
  undoRef: z.string().nullable().optional(),
});

export async function GET(_request: Request, { params }: RouteParams) {
  const entries = await listActivity(params.id);
  return NextResponse.json(entries);
}

export async function POST(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = logInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const entry = await logActivity({
    projectId: params.id,
    actor: parsed.data.actor,
    action: parsed.data.action,
    payload: parsed.data.payload ?? null,
    undoRef: parsed.data.undoRef ?? null,
  });

  return NextResponse.json(entry, { status: 201 });
}
