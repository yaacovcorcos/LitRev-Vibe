import { useMutation, useQueryClient } from "@tanstack/react-query";

import { candidateKeys } from "@/hooks/use-candidates";

type SnippetInput = {
  projectId: string;
  candidateId: string;
};

async function requestSnippets({ projectId, candidateId }: SnippetInput) {
  const response = await fetch(`/api/projects/${projectId}/snippets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ candidateIds: [candidateId] }),
  });

  if (!response.ok) {
    throw new Error("Failed to enqueue snippet extraction");
  }

  return response.json() as Promise<{ jobId: string }>;
}

export function useSnippetExtraction(page = 0, pageSize = 20, statuses: string[] = ["pending"]) {
  const queryClient = useQueryClient();

  return useMutation<{ jobId: string }, Error, SnippetInput>({
    mutationFn: requestSnippets,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: candidateKeys.list(variables.projectId, page, pageSize, statuses),
      });
    },
  });
}
