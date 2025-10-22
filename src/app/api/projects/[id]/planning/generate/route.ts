import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  extractPlanContent,
  normalizeResearchPlan,
  type ResearchPlanContent,
} from "@/lib/planning/plan";
import { generateResearchPlanSuggestion } from "@/lib/ai/plan-generator";

const generateSchema = z.object({
  plan: z
    .object({
      scope: z.string().optional(),
      questions: z.string().optional(),
      queryStrategy: z.string().optional(),
      outline: z.string().optional(),
    })
    .partial()
    .optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const json = await request.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.format() },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingPlan = await prisma.researchPlan.findUnique({
    where: { projectId: params.id },
  });

  const currentPlan: ResearchPlanContent | null = existingPlan
    ? extractPlanContent(normalizeResearchPlan(existingPlan))
    : null;

  const overrides = parsed.data.plan;

  const suggestion = await generateResearchPlanSuggestion({
    project,
    currentPlan,
    overrides: overrides ?? undefined,
  });

  return NextResponse.json({ plan: suggestion });
}
