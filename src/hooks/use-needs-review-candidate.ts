import { useMutation, useQueryClient } from "@tanstack/react-query";

import { candidateKeys } from "@/hooks/use-candidates";

type NeedsReviewCandidateInput = {
  projectId: string;
  candidateId: string;
  reason?: string;
  note?: string;
};

export function useNeedsReviewCandidate(page = 0, pageSize = 20, statuses: string[] = ["pending"]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, candidateId, ...payload }: NeedsReviewCandidateInput) => {
      const response = await fetch(`/api/projects/${projectId}/candidates/${candidateId}/needs-review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to mark candidate as needs review");
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
