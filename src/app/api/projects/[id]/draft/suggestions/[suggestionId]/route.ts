import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveDraftSuggestion } from "@/lib/compose/suggestions";

const resolveSchema = z.object({
  action: z.enum(["accept", "dismiss"]),
});

type RouteParams = {
  params: {
    id: string;
    suggestionId: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = resolveSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const suggestion = await resolveDraftSuggestion(
      params.suggestionId,
      parsed.data.action,
      "user",
    );

    if (!suggestion || suggestion.projectId !== params.id) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
