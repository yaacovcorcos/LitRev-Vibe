import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const ledgerKeys = {
  list: (projectId: string, page: number, pageSize: number) => ["ledger", projectId, page, pageSize] as const,
};

export type LedgerEntry = {
  id: string;
  projectId: string;
  citationKey: string;
  metadata: Record<string, unknown>;
  provenance: Record<string, unknown>;
  locators: Array<Record<string, unknown>>;
  integrityNotes?: Record<string, unknown> | null;
  importedFrom?: string | null;
  keptAt: string;
  verifiedByHuman: boolean;
  createdAt: string;
  updatedAt: string;
};

type LedgerResponse = {
  entries: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
};

type AddLocatorInput = {
  projectId: string;
  entryId: string;
  locator: {
    page?: number;
    paragraph?: number;
    sentence?: number;
    note?: string;
  };
};

async function fetchLedger(projectId: string, page: number, pageSize: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const response = await fetch(`/api/projects/${projectId}/ledger?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load ledger entries");
  }

  return response.json() as Promise<LedgerResponse>;
}

async function addLocator({ projectId, entryId, locator }: AddLocatorInput) {
  const response = await fetch(`/api/projects/${projectId}/ledger/${entryId}/locators`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ locator }),
  });

  if (!response.ok) {
    throw new Error("Failed to add locator");
  }

  return response.json() as Promise<LedgerEntry>;
}

export function useLedgerEntries(projectId: string | null, page = 0, pageSize = 20) {
  return useQuery({
    queryKey: ledgerKeys.list(projectId ?? "unknown", page, pageSize),
    queryFn: () => fetchLedger(projectId as string, page, pageSize),
    enabled: Boolean(projectId),
  });
}

export function useAddLocator(page = 0, pageSize = 20) {
  const queryClient = useQueryClient();

  return useMutation<LedgerEntry, Error, AddLocatorInput>({
    mutationFn: addLocator,
    onSuccess: (updatedEntry, variables) => {
      queryClient.setQueryData<LedgerResponse | undefined>(
        ledgerKeys.list(variables.projectId, page, pageSize),
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            entries: current.entries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)),
          };
        },
      );
    },
  });
}
