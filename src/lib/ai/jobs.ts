import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { queues } from "@/lib/queue/queue";
import { generateTriageRationale } from "@/lib/ai/rationale";

const triageJobSchema = z.object({
  projectId: z.string(),
  candidateIds: z.array(z.string()).optional(),
});

export type TriageRationaleJobData = z.infer<typeof triageJobSchema>;

export type TriageJobResult = {
  totalCandidates: number;
  successes: number;
  failures: number;
  errors: Array<{ candidateId: string; message: string }>;
};

export async function enqueueTriageRationaleJob(data: TriageRationaleJobData) {
  const payload = triageJobSchema.parse(data);
  return queues.default.add(
    "triage:rationale",
    payload,
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

export async function processTriageRationaleJob(data: unknown): Promise<TriageJobResult> {
  const jobData = triageJobSchema.parse(data);

  const candidates = await prisma.candidate.findMany({
    where: {
      projectId: jobData.projectId,
      ...(jobData.candidateIds ? { id: { in: jobData.candidateIds } } : {}),
    },
    select: {
      id: true,
      projectId: true,
      metadata: true,
      searchAdapter: true,
    },
  });

  let successes = 0;
  let failures = 0;
  const errors: Array<{ candidateId: string; message: string }> = [];

  for (const candidate of candidates) {
    try {
      const rationale = await generateTriageRationale({
        projectId: candidate.projectId,
        candidate,
      });

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          aiRationale: rationale,
        },
      });

      successes += 1;
    } catch (error) {
      failures += 1;
      errors.push({
        candidateId: candidate.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    totalCandidates: candidates.length,
    successes,
    failures,
    errors,
  } satisfies TriageJobResult;
}
