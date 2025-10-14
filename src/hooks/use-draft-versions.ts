import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type DraftVersion = {
  id: string;
  draftSectionId: string;
  version: number;
  status: string;
  createdAt: string;
};

type DraftVersionList = {
  versions: DraftVersion[];
};

type RollbackInput = {
  projectId: string;
  sectionId: string;
  version: number;
};

async function fetchDraftVersions(projectId: string, sectionId: string | null): Promise<DraftVersionList> {
  if (!sectionId) {
    return { versions: [] };
  }

  const response = await fetch(`/api/projects/${projectId}/draft/${sectionId}/versions`);
  if (!response.ok) {
    throw new Error("Failed to load version history");
  }

  return response.json() as Promise<DraftVersionList>;
}

async function rollbackDraftVersion({ projectId, sectionId, version }: RollbackInput) {
  const response = await fetch(`/api/projects/${projectId}/draft/${sectionId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });

  if (!response.ok) {
    throw new Error("Failed to rollback draft version");
  }

  return response.json() as Promise<{ section: unknown }>;
}

export function useDraftVersions(projectId: string | null, sectionId: string | null) {
  return useQuery<DraftVersionList, Error>({
    queryKey: ["draft", "versions", projectId, sectionId],
    queryFn: () => fetchDraftVersions(projectId as string, sectionId),
    enabled: Boolean(projectId && sectionId),
    staleTime: 5_000,
  });
}

export function useRollbackDraftVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rollbackDraftVersion,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["draft", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["draft", "versions", variables.projectId, variables.sectionId] });
    },
  });
}
