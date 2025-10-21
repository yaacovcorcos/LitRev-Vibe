import { prisma } from "@/lib/prisma";
import { SEARCH_JOB_TYPE } from "@/lib/search/jobs";
import { TRIAGE_STATUSES, type TriageStatus, sanitizeTriageStatus } from "@/lib/triage/status";

type SearchJobLog = {
  query?: Record<string, unknown>;
  adapters?: Array<{ id: string; total: number; stored: number }>;
  totals?: {
    totalResults: number;
    inserted: number;
  };
};

export type PrismaFlowMetrics = {
  totalIdentified: number;
  totalStored: number;
  candidateCounts: Record<TriageStatus, number>;
  screened: number;
  included: number;
  pending: number;
  lastSearchCompletedAt: Date | null;
};

function emptyCandidateCounts(): Record<TriageStatus, number> {
  return TRIAGE_STATUSES.reduce<Record<TriageStatus, number>>((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<TriageStatus, number>);
}

export async function getPrismaFlowMetrics(projectId: string): Promise<PrismaFlowMetrics> {
  const [searchJobs, candidateGroups, includedCount] = await Promise.all([
    prisma.job.findMany({
      where: {
        projectId,
        jobType: SEARCH_JOB_TYPE,
        status: "completed",
      },
      select: {
        logs: true,
        completedAt: true,
        updatedAt: true,
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.candidate.groupBy({
      by: ["triageStatus"],
      _count: {
        triageStatus: true,
      },
      where: { projectId },
    }).catch(() => []),
    prisma.ledgerEntry.count({ where: { projectId } }),
  ]);

  let totalIdentified = 0;
  let totalStored = 0;
  let lastSearchCompletedAt: Date | null = null;

  for (const job of searchJobs) {
    const log = job.logs as SearchJobLog | null;
    if (log?.totals) {
      totalIdentified += Number(log.totals.totalResults ?? 0);
      totalStored += Number(log.totals.inserted ?? 0);
    }

    const completed = job.completedAt ?? job.updatedAt ?? null;
    if (!lastSearchCompletedAt || (completed && completed > lastSearchCompletedAt)) {
      lastSearchCompletedAt = completed;
    }
  }

  const candidateCounts = emptyCandidateCounts();

  for (const group of candidateGroups) {
    const status = sanitizeTriageStatus(group.triageStatus);
    candidateCounts[status] = group._count.triageStatus;
  }

  const screened = candidateCounts.kept + candidateCounts.discarded + candidateCounts.needs_review;

  return {
    totalIdentified,
    totalStored,
    candidateCounts,
    screened,
    included: includedCount,
    pending: candidateCounts.pending,
    lastSearchCompletedAt,
  };
}
