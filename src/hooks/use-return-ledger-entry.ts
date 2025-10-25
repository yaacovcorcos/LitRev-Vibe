import { useMutation, useQueryClient } from "@tanstack/react-query";

import { candidateKeys } from "@/hooks/use-candidates";
import { ledgerKeys } from "@/hooks/use-ledger";

type ReturnLedgerEntryInput = {
  projectId: string;
  entryId: string;
  status: "pending" | "needs_review";
  note?: string;
  reason?: string;
};

type ReturnLedgerEntryResponse = {
  candidateId: string;
  status: "pending" | "needs_review";
};

async function returnLedgerEntry({ projectId, entryId, status, note, reason }: ReturnLedgerEntryInput) {
  const response = await fetch(`/api/projects/${projectId}/ledger/${entryId}/return`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status, note, reason }),
  });

  if (!response.ok) {
    throw new Error("Failed to return ledger entry to triage");
  }

  return response.json() as Promise<ReturnLedgerEntryResponse>;
}

export function useReturnLedgerEntry(page = 0, pageSize = 20) {
  const queryClient = useQueryClient();

  return useMutation<ReturnLedgerEntryResponse, Error, ReturnLedgerEntryInput>({
    mutationFn: returnLedgerEntry,
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(
        ledgerKeys.list(variables.projectId, page, pageSize),
        (current: { entries: any[]; total: number; page: number; pageSize: number } | undefined) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            entries: current.entries.filter((entry) => entry.id !== variables.entryId),
            total: Math.max(0, current.total - 1),
          };
        },
      );

      queryClient.invalidateQueries({
        queryKey: candidateKeys.all(variables.projectId),
      });
    },
  });
}
