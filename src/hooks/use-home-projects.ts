import { useQuery } from "@tanstack/react-query";

type ProjectDraftSummary = {
  total: number;
  approved: number;
  percent: number | null;
};

type ProjectRunSummary = {
  active: number;
  lastStatus: string | null;
  lastCompletedAt: string | null;
};

export type HomeProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  ledgerCount: number;
  draft: ProjectDraftSummary;
  runs: ProjectRunSummary;
  pinned: boolean;
};

type HomeProjectsResponse = {
  projects: HomeProjectSummary[];
};

async function fetchHomeProjects(limit: number): Promise<HomeProjectsResponse> {
  const searchParams = new URLSearchParams();
  if (limit) {
    searchParams.set("limit", String(limit));
  }

  const response = await fetch(`/api/home/projects?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load projects");
  }

  return response.json();
}

export function useHomeProjects(limit = 4) {
  return useQuery<HomeProjectsResponse, Error>({
    queryKey: ["home-projects", limit],
    queryFn: () => fetchHomeProjects(limit),
    staleTime: 30_000,
  });
}
