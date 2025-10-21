import type { ExportStatus } from "@/generated/prisma";

type ExportStatusTone = "default" | "success" | "warning" | "destructive";

export type ExportStatusDisplay = {
  label: string;
  tone: ExportStatusTone;
};

const STATUS_MAP: Record<ExportStatus, ExportStatusDisplay> = {
  pending: {
    label: "Pending",
    tone: "default",
  },
  queued: {
    label: "Queued",
    tone: "default",
  },
  in_progress: {
    label: "In progress",
    tone: "warning",
  },
  completed: {
    label: "Completed",
    tone: "success",
  },
  failed: {
    label: "Failed",
    tone: "destructive",
  },
};

export function getExportStatusDisplay(status: ExportStatus): ExportStatusDisplay {
  return STATUS_MAP[status] ?? STATUS_MAP.pending;
}
