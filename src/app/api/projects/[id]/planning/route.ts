import { NextResponse } from "next/server";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { toInputJson } from "@/lib/prisma/json";
import {
  DEFAULT_PLAN,
  EMPTY_PLAN_RESPONSE,
  normalizeResearchPlan,
} from "@/lib/planning/plan";
import { logActivity } from "@/lib/activity-log";

type RouteParams = {
  params: {
    id: string;
  };
};

const planSchema = z.object({
  scope: z.string().max(20000).optional(),
  questions: z.string().max(20000).optional(),
  queryStrategy: z.string().max(20000).optional(),
  outline: z.string().max(20000).optional(),
  targetSources: z.array(z.string().min(1)).max(25).optional(),
  status: z.string().optional(),
});

export async function GET(_request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const plan = await prisma.researchPlan.findUnique({
    where: { projectId: params.id },
  });

  if (!plan) {
    return NextResponse.json(EMPTY_PLAN_RESPONSE);
  }

  return NextResponse.json(normalizeResearchPlan(plan));
}

export async function PUT(request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await request.json();
  const parsed = planSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.format() },
      { status: 400 },
    );
  }

  const planInput = parsed.data;
  const existingPlan = await prisma.researchPlan.findUnique({
    where: { projectId: params.id },
    select: { status: true },
  });

  const scopeValue = planInput.scope ?? DEFAULT_PLAN.scope;
  const questionsValue = planInput.questions ?? DEFAULT_PLAN.questions;
  const queryStrategyValue =
    planInput.queryStrategy ?? DEFAULT_PLAN.queryStrategy;
  const outlineValue = planInput.outline ?? DEFAULT_PLAN.outline;

  const updatePayload: Prisma.ResearchPlanUpsertArgs["update"] = {
    scope: toInputJson(scopeValue),
    questions: toInputJson(questionsValue),
    queryStrategy: toInputJson(queryStrategyValue),
    outline: toInputJson(outlineValue),
  };

  if (planInput.targetSources !== undefined) {
    updatePayload.targetSources = planInput.targetSources;
  }
  if (planInput.status !== undefined) {
    updatePayload.status = planInput.status;
  }

  const createPayload: Prisma.ResearchPlanUpsertArgs["create"] = {
    projectId: params.id,
    scope: toInputJson(scopeValue),
    questions: toInputJson(questionsValue),
    queryStrategy: toInputJson(queryStrategyValue),
    outline: toInputJson(outlineValue),
    targetSources: planInput.targetSources ?? [],
    status: planInput.status ?? "draft",
  };

  const plan = await prisma.researchPlan.upsert({
    where: { projectId: params.id },
    update: updatePayload,
    create: createPayload,
  });

  const response = normalizeResearchPlan(plan);
  if (planInput.status === undefined && existingPlan?.status) {
    response.status = existingPlan.status;
  }

  const changedFields = Object.keys(planInput);

  await logActivity({
    projectId: params.id,
    action: existingPlan ? "plan.updated" : "plan.created",
    payload: {
      changedFields,
      status: response.status,
    },
  });

  return NextResponse.json(response);
}
