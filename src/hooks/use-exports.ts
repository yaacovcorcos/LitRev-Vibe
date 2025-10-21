import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ExportStatus } from "@/generated/prisma";

type ExportJobInfo = {
  id: string;
  status: string;
  progress: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ExportHistoryItem = {
  id: string;
  format: string;
  status: ExportStatus;
  options: Record<string, unknown>;
  storagePath: string | null;
  storageUrl: string | null;
  jobId: string | null;
  createdAt: string;
  completedAt: string | null;
  error: unknown;
  job: ExportJobInfo | null;
};

type ExportHistoryResponse = {
  exports: ExportHistoryItem[];
};

export type ExportMetrics = {
  totalIdentified: number;
  totalStored: number;
  candidateCounts: Record<string, number>;
  screened: number;
  included: number;
  pending: number;
  lastSearchCompletedAt: string | null;
};

type ExportMetricsResponse = {
  metrics: ExportMetrics;
};

type EnqueueExportInput = {
  projectId: string;
  format: string;
  includePrismaDiagram: boolean;
  includeLedger: boolean;
};

async function fetchExportHistory(projectId: string, limit: number): Promise<ExportHistoryResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`/api/projects/${projectId}/exports?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to load export history");
  }

  return response.json();
}

async function fetchExportMetrics(projectId: string): Promise<ExportMetricsResponse> {
  const response = await fetch(`/api/projects/${projectId}/exports/metrics`);

  if (!response.ok) {
    throw new Error("Failed to load PRISMA metrics");
  }

  return response.json();
}

async function enqueueExport({ projectId, ...payload }: EnqueueExportInput) {
  const response = await fetch(`/api/projects/${projectId}/exports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = typeof error?.error === "string" ? error.error : "Unable to enqueue export";
    const finalError = new Error(message);
    (finalError as Error & { status?: number }).status = response.status;
    throw finalError;
  }

  return response.json() as Promise<{ jobId: string; exportId: string }>;
}

export function useExportHistory(projectId: string | null, limit = 25) {
  return useQuery<ExportHistoryResponse, Error>({
    queryKey: ["export-history", projectId ?? "unknown", limit],
    queryFn: () => fetchExportHistory(projectId as string, limit),
    enabled: Boolean(projectId),
    refetchInterval: 10_000,
  });
}

export function useExportMetrics(projectId: string | null) {
  return useQuery<ExportMetricsResponse, Error>({
    queryKey: ["export-metrics", projectId ?? "unknown"],
    queryFn: () => fetchExportMetrics(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: 15_000,
  });
}

export function useEnqueueExport(limit = 25) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enqueueExport,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["export-history", variables.projectId, limit] });
      queryClient.invalidateQueries({ queryKey: ["export-metrics", variables.projectId] });
    },
  });
}
