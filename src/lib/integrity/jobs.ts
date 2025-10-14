import { queues } from "@/lib/queue/queue";
import { ingestIntegrityFeeds } from "@/lib/integrity/feeds";

export type IntegrityJobResult = {
  updatedCandidates: number;
};

export async function enqueueIntegrityIngestionJob() {
  return queues.default.add("integrity:ingest", {}, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function processIntegrityIngestionJob(): Promise<IntegrityJobResult> {
  let updated = 0;

  await ingestIntegrityFeeds({
    onCandidateUpdate: () => {
      updated += 1;
    },
  });

  return {
    updatedCandidates: updated,
  } satisfies IntegrityJobResult;
}
