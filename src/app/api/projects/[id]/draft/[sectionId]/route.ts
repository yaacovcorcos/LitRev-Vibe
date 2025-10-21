import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureDraftSectionVersion, recordDraftSectionVersion } from "@/lib/compose/versions";
import { prisma } from "@/lib/prisma";

const updateDraftSectionSchema = z.object({
  content: z.any().optional(),
  status: z.enum(["draft", "approved"]).optional(),
});

type RouteParams = {
  params: {
    id: string;
    sectionId: string;
  };
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = updateDraftSectionSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const section = await prisma.$transaction(async (tx) => {
      const existing = await tx.draftSection.findFirst({
        where: {
          id: params.sectionId,
          projectId: params.id,
        },
      });

      if (!existing) {
        throw new Error("Draft section not found");
      }

      await ensureDraftSectionVersion(tx, {
        id: existing.id,
        version: existing.version,
        status: existing.status,
        content: existing.content,
      });

      const shouldIncrementVersion = Boolean(parsed.data.content);

      const updated = await tx.draftSection.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.content
            ? {
              content: parsed.data.content,
              version: existing.version + 1,
              status: "draft",
              approvedAt: null,
            }
            : {}),
          ...(parsed.data.status
            ? {
              status: parsed.data.status,
              approvedAt: parsed.data.status === "approved" ? new Date() : null,
            }
            : {}),
        },
      });

      if (shouldIncrementVersion || parsed.data.status === "approved") {
        await recordDraftSectionVersion(tx, {
          id: updated.id,
          version: updated.version,
          status: updated.status,
          content: updated.content,
        });
      }

      return updated;
    });

    return NextResponse.json(section);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    if (process.env.NODE_ENV !== "production") {
      console.error("[draft:update]", error);
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
