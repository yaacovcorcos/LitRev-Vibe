import { NextResponse } from "next/server";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { toInputJson } from "@/lib/prisma/json";
import { serializeProject } from "@/lib/projects/serialize";
import {
  projectSettingsPatchSchema,
  resolveProjectSettings,
} from "@/lib/projects/settings";

const projectInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  settings: projectSettingsPatchSchema.optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(serializeProject(project));
}

export async function PUT(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = projectInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Prisma.ProjectUpdateInput = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  };

  if (parsed.data.settings !== undefined) {
    const baseSettings = normalizeProjectSettings(existing.settings);
    const mergedSettings = resolveProjectSettings(parsed.data.settings, baseSettings);
    updateData.settings = toInputJson(mergedSettings);
  }

  try {
    const project = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(serializeProject(project));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
