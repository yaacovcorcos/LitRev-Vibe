import { NextResponse } from "next/server";
import { z } from "zod";

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

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects.map(serializeProject));
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = projectInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const settings = resolveProjectSettings(parsed.data.settings);

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      settings: toInputJson(settings),
    },
  });

  return NextResponse.json(serializeProject(project), { status: 201 });
}
