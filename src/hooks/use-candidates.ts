import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SearchQuery } from "@/lib/search";
import type { TriageStatus } from "@/lib/triage/status";

export const candidateKeys = {
  base: "candidates" as const,
  all: (projectId: string) => ["candidates", projectId] as const,
  list: (projectId: string, page: number, pageSize: number, statuses: string[]) =>
    ["candidates", projectId, page, pageSize, statuses.join("|")] as const,
};

export type Candidate = {
  id: string;
  projectId: string;
  searchAdapter: string;
  externalIds: Record<string, unknown>;
  metadata: Record<string, unknown>;
  oaLinks?: Record<string, unknown> | null;
  integrityFlags?: unknown;
  aiRationale?: Record<string, unknown> | null;
  locatorSnippets?: unknown;
  triageStatus: TriageStatus;
  createdAt: string;
};

type CandidateResponse = {
  candidates: Candidate[];
  total: number;
  page: number;
  pageSize: number;
};

type EnqueueSearchInput = {
  projectId: string;
  query: SearchQuery;
  adapters?: string[];
};

async function fetchCandidates(projectId: string, page: number, pageSize: number, statuses: string[]) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (statuses.length > 0) {
    params.set("status", statuses.join(","));
  }
  const response = await fetch(`/api/projects/${projectId}/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load candidates");
  }

  return response.json() as Promise<CandidateResponse>;
}

async function enqueueSearch({ projectId, query, adapters }: EnqueueSearchInput) {
  const response = await fetch(`/api/projects/${projectId}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, adapters }),
  });

  if (!response.ok) {
    throw new Error("Failed to enqueue search job");
  }

  return response.json() as Promise<{ jobId: string }>;
}

export function useCandidates(projectId: string | null, page = 0, pageSize = 20, statuses: string[] = ["pending"]) {
  const key = candidateKeys.list(projectId ?? "unknown", page, pageSize, statuses);
  return useQuery({
    queryKey: key,
    queryFn: () => fetchCandidates(projectId as string, page, pageSize, statuses),
    enabled: Boolean(projectId),
  });
}

export function useEnqueueSearch(page = 0, pageSize = 20, statuses: string[] = ["pending"]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enqueueSearch,
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: candidateKeys.list(projectId, page, pageSize, statuses),
      });
    },
  });
}
