import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SearchQuery } from "@/lib/search";

const candidateKeys = {
  all: (projectId: string) => ["candidates", projectId] as const,
};

export type Candidate = {
  id: string;
  projectId: string;
  searchAdapter: string;
  externalIds: Record<string, unknown>;
  metadata: Record<string, unknown>;
  oaLinks?: Record<string, unknown> | null;
  integrityFlags?: Record<string, unknown> | null;
  triageStatus: string;
  createdAt: string;
};

type EnqueueSearchInput = {
  projectId: string;
  query: SearchQuery;
  adapters?: string[];
};

async function fetchCandidates(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/search`);

  if (!response.ok) {
    throw new Error("Failed to load candidates");
  }

  return response.json() as Promise<Candidate[]>;
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

export function useCandidates(projectId: string | null) {
  const key = candidateKeys.all(projectId ?? "unknown");
  return useQuery({
    queryKey: key,
    queryFn: () => fetchCandidates(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useEnqueueSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enqueueSearch,
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: candidateKeys.all(projectId) });
    },
  });
}
