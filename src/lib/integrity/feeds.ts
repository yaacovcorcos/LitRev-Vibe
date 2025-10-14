import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type IntegrityFlag = {
  label: string;
  severity: "info" | "warning" | "critical";
  source: "retraction-watch" | "doaj" | string;
  reason?: string;
  details?: string;
};

type CandidateIntegrityUpdate = {
  candidateId: string;
  flags: IntegrityFlag[];
};

export async function fetchRetractionWatchSnapshot(): Promise<CandidateIntegrityUpdate[]> {
  console.warn("Retraction Watch ingestion is currently stubbed.");
  return [];
}

export async function fetchDoajSnapshot(): Promise<CandidateIntegrityUpdate[]> {
  console.warn("DOAJ ingestion is currently stubbed.");
  return [];
}

export async function applyIntegrityFlags(updates: CandidateIntegrityUpdate[]) {
  if (updates.length === 0) {
    return;
  }

  await Promise.all(
    updates.map((update) =>
      prisma.candidate.update({
        where: { id: update.candidateId },
        data: {
          integrityFlags: (update.flags as unknown) as Prisma.JsonValue,
        },
      }),
    ),
  );
}

export async function ingestIntegrityFeeds() {
  const retractionUpdates = await fetchRetractionWatchSnapshot();
  const doajUpdates = await fetchDoajSnapshot();

  const grouped = new Map<string, IntegrityFlag[]>();

  [...retractionUpdates, ...doajUpdates].forEach((update) => {
    const existing = grouped.get(update.candidateId) ?? [];
    grouped.set(update.candidateId, existing.concat(update.flags));
  });

  if (grouped.size === 0) {
    return;
  }

  await applyIntegrityFlags(
    Array.from(grouped.entries()).map(([candidateId, flags]) => ({ candidateId, flags })),
  );
}
