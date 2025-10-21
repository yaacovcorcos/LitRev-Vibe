import { NextResponse } from "next/server";
import { z } from "zod";

import { createDraftSuggestion, listDraftSuggestions } from "@/lib/compose/suggestions";

const suggestionRequestSchema = z.object({
  draftSectionId: z.string(),
  suggestionType: z.enum(["improvement", "clarity", "expansion"]).optional(),
  narrativeVoice: z.enum(["neutral", "confident", "cautious"]).optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId") ?? undefined;

  try {
    const suggestions = await listDraftSuggestions(params.id, sectionId);
    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = suggestionRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const suggestionType = parsed.data.suggestionType ?? "improvement";
    const createPayload: Parameters<typeof createDraftSuggestion>[0] = {
      projectId: params.id,
      draftSectionId: parsed.data.draftSectionId,
      suggestionType,
      ...(parsed.data.narrativeVoice
        ? { narrativeVoice: parsed.data.narrativeVoice }
        : {}),
    };

    const suggestion = await createDraftSuggestion(createPayload);

    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
