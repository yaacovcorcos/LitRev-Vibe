import { beforeEach, describe, expect, it, vi } from "vitest";

declare const global: { __integrityMockCount?: number };

global.__integrityMockCount = 0;

vi.mock("@/lib/queue/queue", () => ({
  queues: {
    default: {
      add: vi.fn(async () => ({ id: "job-123" })),
    },
  },
}));

vi.mock("@/lib/integrity/feeds", () => ({
  ingestIntegrityFeeds: vi.fn(async ({ onCandidateUpdate }: { onCandidateUpdate?: () => void }) => {
    if (onCandidateUpdate) {
      onCandidateUpdate();
      onCandidateUpdate();
    }
    global.__integrityMockCount = (global.__integrityMockCount ?? 0) + 1;
  }),
}));

const { enqueueIntegrityIngestionJob, processIntegrityIngestionJob } = await import("./jobs");

describe("integrity jobs", () => {
  beforeEach(() => {
    global.__integrityMockCount = 0;
  });

  it("queues integrity job", async () => {
    const job = await enqueueIntegrityIngestionJob();
    expect(job.id).toBe("job-123");
  });

  it("processes integrity job and counts updates", async () => {
    const result = await processIntegrityIngestionJob();
    expect(result.updatedCandidates).toBe(2);
    expect(global.__integrityMockCount).toBe(1);
  });
});
