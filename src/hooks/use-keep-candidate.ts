import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { LedgerEntry } from "@/hooks/use-ledger";
import { candidateKeys } from "@/hooks/use-candidates";

type KeepCandidateInput = {
  projectId: string;
  candidateId: string;
  locator: {
    page?: number;
    paragraph?: number;
    sentence?: number;
    note?: string;
    quote?: string;
    source?: string;
  };
};

async function keepCandidate({ projectId, candidateId, locator }: KeepCandidateInput) {
  const response = await fetch(`/api/projects/${projectId}/candidates/${candidateId}/keep`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locator }),
  });

  if (!response.ok) {
    throw new Error("Failed to keep candidate. Add at least one locator detail.");
  }

  return response.json() as Promise<LedgerEntry>;
}

export function useKeepCandidate(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<LedgerEntry, Error, KeepCandidateInput>({
    mutationFn: keepCandidate,
    onSuccess: (_entry, variables) => {
      queryClient.invalidateQueries({
        queryKey: candidateKeys.all(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: ["ledger", variables.projectId],
      });
    },
    meta: {
      projectId,
    },
  });
}
