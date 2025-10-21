import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DraftSectionRecord = {
  id: string;
  projectId: string;
  sectionType: string;
  content: Record<string, unknown>;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  ledgerEntries: Array<{
    id: string;
    citationKey: string;
    verifiedByHuman: boolean;
  }>;
  versionHistory: Array<{
    id: string;
    version: number;
    status: string;
    createdAt: string;
  }>;
};

type DraftSectionsResponse = {
  sections: DraftSectionRecord[];
};

async function fetchDraftSections(projectId: string): Promise<DraftSectionsResponse> {
  const response = await fetch(`/api/projects/${projectId}/draft`);

  if (!response.ok) {
    throw new Error("Failed to load draft sections");
  }

  return response.json() as Promise<DraftSectionsResponse>;
}

export function useDraftSections(projectId: string | null) {
  return useQuery<DraftSectionsResponse, Error>({
    queryKey: ["draft", projectId],
    queryFn: () => fetchDraftSections(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 5_000,
    refetchInterval: 15_000,
  });
}

type UpdateDraftSectionInput = {
  projectId: string;
  sectionId: string;
  content?: Record<string, unknown>;
  status?: "draft" | "approved";
};

async function updateDraftSection({ projectId, sectionId, ...payload }: UpdateDraftSectionInput) {
  const response = await fetch(`/api/projects/${projectId}/draft/${sectionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update draft section");
  }

  return response.json() as Promise<DraftSectionRecord>;
}

export function useUpdateDraftSection() {
  const queryClient = useQueryClient();

  return useMutation<DraftSectionRecord, Error, UpdateDraftSectionInput>({
    mutationFn: updateDraftSection,
    onSuccess: (_section, variables) => {
      queryClient.invalidateQueries({ queryKey: ["draft", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["draft", "versions", variables.projectId, variables.sectionId] });
    },
  });
}
