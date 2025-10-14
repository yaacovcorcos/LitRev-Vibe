import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestIntegrityFeedsMock = vi.fn(
  async ({ onCandidateUpdate }: { onCandidateUpdate?: () => void }) => {
    if (onCandidateUpdate) {
      onCandidateUpdate();
      onCandidateUpdate();
    }
  },
);

vi.mock("@/lib/queue/queue", () => ({
  queues: {
    default: {
      add: vi.fn(async () => ({ id: "job-123" })),
    },
  },
}));

vi.mock("@/lib/integrity/feeds", () => ({
  ingestIntegrityFeeds: ingestIntegrityFeedsMock,
}));

const { enqueueIntegrityIngestionJob, processIntegrityIngestionJob } = await import("./jobs");

describe("integrity jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues integrity job", async () => {
    const job = await enqueueIntegrityIngestionJob();
    expect(job.id).toBe("job-123");
  });

  it("processes integrity job and counts updates", async () => {
    const result = await processIntegrityIngestionJob();
    expect(result.updatedCandidates).toBe(2);
    expect(ingestIntegrityFeedsMock).toHaveBeenCalledTimes(1);
  });
});
