import { useQuery } from "@tanstack/react-query";

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
