import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DraftSuggestion = {
  id: string;
  projectId: string;
  draftSectionId: string;
  suggestionType: string;
  summary: string | null;
  diff: Record<string, unknown>;
  content: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

type SuggestionListResponse = {
  suggestions: DraftSuggestion[];
};

type RequestSuggestionInput = {
  projectId: string;
  draftSectionId: string;
  suggestionType?: "improvement" | "clarity" | "expansion";
  narrativeVoice?: "neutral" | "confident" | "cautious";
};

type ResolveSuggestionInput = {
  projectId: string;
  suggestionId: string;
  action: "accept" | "dismiss";
};

async function fetchSuggestions(projectId: string, sectionId?: string | null): Promise<SuggestionListResponse> {
  const url = new URLSearchParams();
  if (sectionId) {
    url.set("sectionId", sectionId);
  }

  const endpoint = url.toString().length > 0
    ? `/api/projects/${projectId}/draft/suggestions?${url.toString()}`
    : `/api/projects/${projectId}/draft/suggestions`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error("Failed to load suggestions");
  }

  return response.json() as Promise<SuggestionListResponse>;
}

async function requestSuggestion({ projectId, ...payload }: RequestSuggestionInput) {
  const response = await fetch(`/api/projects/${projectId}/draft/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to generate suggestion");
  }

  return response.json() as Promise<{ suggestion: DraftSuggestion }>;
}

async function resolveSuggestion({ projectId, suggestionId, action }: ResolveSuggestionInput) {
  const response = await fetch(`/api/projects/${projectId}/draft/suggestions/${suggestionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    throw new Error("Failed to resolve suggestion");
  }

  return response.json() as Promise<{ suggestion: DraftSuggestion }>;
}

export function useDraftSuggestions(projectId: string | null, sectionId?: string | null) {
  return useQuery<SuggestionListResponse, Error>({
    queryKey: ["draft", "suggestions", projectId, sectionId],
    queryFn: () => fetchSuggestions(projectId as string, sectionId ?? undefined),
    enabled: Boolean(projectId),
    refetchInterval: 15_000,
  });
}

export function useRequestDraftSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestSuggestion,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["draft", "suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["draft"] });
      return result;
    },
  });
}

export function useResolveDraftSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveSuggestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft", "suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["draft"] });
    },
  });
}
