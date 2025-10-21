export const TRIAGE_STATUSES = ["pending", "kept", "discarded", "needs_review"] as const;
export type TriageStatus = typeof TRIAGE_STATUSES[number];

export function sanitizeTriageStatus(value: unknown): TriageStatus {
  if (typeof value !== "string") {
    return "pending";
  }

  const normalized = value.toLowerCase() as TriageStatus;
  return (TRIAGE_STATUSES as readonly string[]).includes(normalized) ? normalized : "pending";
}

export function isTerminalStatus(status: TriageStatus) {
  return status === "kept" || status === "discarded";
}
