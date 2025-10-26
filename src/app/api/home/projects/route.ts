import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizeProjectSettings } from "@/lib/projects/settings";

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  ledgerCount: number;
  draft: {
    total: number;
    approved: number;
    percent: number | null;
  };
  runs: {
    active: number;
    lastStatus: string | null;
    lastCompletedAt: string | null;
  };
  pinned: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam !== null ? Number(limitParam) : NaN;
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 8))
    : 4;

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  if (projects.length === 0) {
    return NextResponse.json({ projects: [] satisfies ProjectSummary[] });
  }

  const projectIds = projects.map((project) => project.id);

  const [
    ledgerCountsRaw,
    totalDraftSectionsRaw,
    approvedDraftSectionsRaw,
    activeRunsRaw,
    latestJobs,
  ] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ["projectId"],
      _count: { _all: true },
      where: { projectId: { in: projectIds } },
    }),
    prisma.draftSection.groupBy({
      by: ["projectId"],
      _count: { _all: true },
      where: { projectId: { in: projectIds } },
    }),
    prisma.draftSection.groupBy({
      by: ["projectId"],
      _count: { _all: true },
      where: {
        projectId: { in: projectIds },
        status: "approved",
      },
    }),
    prisma.job.groupBy({
      by: ["projectId"],
      _count: { _all: true },
      where: {
        projectId: { in: projectIds },
        status: { in: ["queued", "in_progress"] },
      },
    }),
    prisma.job.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["projectId"],
      select: {
        projectId: true,
        status: true,
        completedAt: true,
      },
    }),
  ]);

  const ledgerCountMap = new Map(ledgerCountsRaw.map((item) => [item.projectId, item._count._all]));
  const draftCountMap = new Map(totalDraftSectionsRaw.map((item) => [item.projectId, item._count._all]));
  const approvedCountMap = new Map(approvedDraftSectionsRaw.map((item) => [item.projectId, item._count._all]));
  const activeRunsMap = new Map(activeRunsRaw.map((item) => [item.projectId, item._count._all]));
  const latestJobMap = new Map(latestJobs.map((job) => [job.projectId, job]));

  const summaries: ProjectSummary[] = projects.map((project) => {
    const settings = normalizeProjectSettings(project.settings);
    const ledgerCount = ledgerCountMap.get(project.id) ?? 0;
    const draftTotal = draftCountMap.get(project.id) ?? 0;
    const draftApproved = approvedCountMap.get(project.id) ?? 0;
    const draftPercent = draftTotal > 0 ? Math.round((draftApproved / draftTotal) * 100) : null;
    const activeRuns = activeRunsMap.get(project.id) ?? 0;
    const lastJob = latestJobMap.get(project.id) ?? null;

    return {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      updatedAt: project.updatedAt.toISOString(),
      ledgerCount,
      draft: {
        total: draftTotal,
        approved: draftApproved,
        percent: draftPercent,
      },
      runs: {
        active: activeRuns,
        lastStatus: lastJob?.status ?? null,
        lastCompletedAt: lastJob?.completedAt?.toISOString() ?? null,
      },
      pinned: Boolean(settings.home?.pinned ?? false),
    } satisfies ProjectSummary;
  });

  return NextResponse.json({ projects: summaries });
}
