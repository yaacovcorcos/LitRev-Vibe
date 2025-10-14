import { NextResponse } from "next/server";
import { z } from "zod";

import { listDraftSectionVersions, rollbackDraftSection } from "@/lib/compose/versions";

const rollbackSchema = z.object({
  version: z.number().int().min(1),
});

type RouteParams = {
  params: {
    id: string;
    sectionId: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const versions = await listDraftSectionVersions(params.id, params.sectionId);
    return NextResponse.json({
      versions: versions.map((version) => ({
        id: version.id,
        draftSectionId: version.draftSectionId,
        version: version.version,
        status: version.status,
        createdAt: version.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 404 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = rollbackSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const section = await rollbackDraftSection(params.id, params.sectionId, parsed.data.version);
    return NextResponse.json({ section });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
