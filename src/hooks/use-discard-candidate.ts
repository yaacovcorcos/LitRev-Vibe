import { useMutation, useQueryClient } from "@tanstack/react-query";

import { candidateKeys } from "@/hooks/use-candidates";

type DiscardCandidateInput = {
  projectId: string;
  candidateId: string;
  reason?: string;
  note?: string;
};

export function useDiscardCandidate(page = 0, pageSize = 20, statuses: string[] = ["pending"]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, candidateId, ...payload }: DiscardCandidateInput) => {
      const response = await fetch(`/api/projects/${projectId}/candidates/${candidateId}/discard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to discard candidate");
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: candidateKeys.list(variables.projectId, page, pageSize, statuses),
      });
    },
  });
}
