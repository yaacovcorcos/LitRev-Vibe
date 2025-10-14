import { NextResponse } from "next/server";
import { z } from "zod";

import { askCandidateQuestion, generateTriageRationale, isTriageRationale } from "@/lib/ai/rationale";
import { prisma } from "@/lib/prisma";

const askSchema = z.object({
  question: z.string().min(1, "Question is required"),
});

type RouteParams = {
  params: {
    id: string;
    candidateId: string;
  };
};

async function loadCandidate(projectId: string, candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate || candidate.projectId !== projectId) {
    return null;
  }

  return candidate;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const candidate = await loadCandidate(params.id, params.candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  if (candidate.aiRationale && isTriageRationale(candidate.aiRationale)) {
    return NextResponse.json(candidate.aiRationale);
  }

  const rationale = await generateTriageRationale({
    projectId: params.id,
    candidate: {
      id: candidate.id,
      metadata: candidate.metadata as Record<string, unknown>,
      searchAdapter: candidate.searchAdapter,
      locatorSnippets: candidate.locatorSnippets as unknown,
    },
  });

  await prisma.candidate.update({
    where: { id: candidate.id },
    data: { aiRationale: rationale },
  });

  return NextResponse.json(rationale);
}

export async function POST(request: Request, { params }: RouteParams) {
  const candidate = await loadCandidate(params.id, params.candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const json = await request.json();
  const parsed = askSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const response = await askCandidateQuestion({
    projectId: params.id,
    candidate: {
      id: candidate.id,
      metadata: candidate.metadata as Record<string, unknown>,
      searchAdapter: candidate.searchAdapter,
      locatorSnippets: candidate.locatorSnippets as unknown,
    },
    question: parsed.data.question,
  });

  return NextResponse.json(response);
}
