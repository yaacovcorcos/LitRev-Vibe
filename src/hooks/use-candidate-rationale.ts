import { useMutation, useQuery } from "@tanstack/react-query";

import { isTriageRationale, type AskAiResponse, type TriageRationale } from "@/lib/ai/rationale";

const rationaleKeys = {
  detail: (projectId: string, candidateId: string) => ["candidate-rationale", projectId, candidateId] as const,
  ask: (projectId: string, candidateId: string, question: string) => [
    "candidate-ask",
    projectId,
    candidateId,
    question,
  ] as const,
};

async function fetchRationale(projectId: string, candidateId: string): Promise<TriageRationale> {
  const response = await fetch(`/api/projects/${projectId}/candidates/${candidateId}/rationale`);

  if (!response.ok) {
    throw new Error("Failed to load AI rationale");
  }

  return response.json() as Promise<TriageRationale>;
}

async function askQuestion(projectId: string, candidateId: string, question: string): Promise<AskAiResponse> {
  const response = await fetch(`/api/projects/${projectId}/candidates/${candidateId}/rationale`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error("Failed to ask AI question");
  }

  return response.json() as Promise<AskAiResponse>;
}

export function useCandidateRationale(
  projectId: string | null,
  candidateId: string | null,
  initialData?: unknown,
) {
  return useQuery<TriageRationale>({
    queryKey: rationaleKeys.detail(projectId ?? "unknown", candidateId ?? "unknown"),
    queryFn: () => fetchRationale(projectId as string, candidateId as string),
    enabled: Boolean(projectId && candidateId),
    initialData: isTriageRationale(initialData) ? initialData : undefined,
  });
}

export function useAskCandidateAI(projectId: string, candidateId: string) {
  return useMutation<AskAiResponse, Error, string>({
    mutationFn: (question: string) => askQuestion(projectId, candidateId, question),
  });
}
