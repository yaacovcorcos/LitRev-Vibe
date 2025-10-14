import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jobs", () => ({
  createJobRecord: vi.fn(async () => ({
    id: "job-123",
    projectId: "project-1",
    jobType: "compose.literature_review",
    status: "queued",
    progress: 0,
  })),
  updateJobRecord: vi.fn(async () => ({
    id: "job-123",
    projectId: "project-1",
    jobType: "compose.literature_review",
    status: "failed",
    progress: 0,
  })),
}));

vi.mock("@/lib/queue/queue", () => ({
  queues: {
    default: {
      add: vi.fn(async () => ({ id: "job-123" })),
    },
  },
}));

import { createJobRecord, updateJobRecord } from "@/lib/jobs";
import { queues } from "@/lib/queue/queue";
import {
  COMPOSE_JOB_TYPE,
  COMPOSE_QUEUE_JOB_NAME,
  buildInitialState,
  composeJobInputSchema,
  enqueueComposeJob,
} from "./jobs";

describe("compose jobs module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds initial state keyed by section ordering", () => {
    const parsed = composeJobInputSchema.parse({
      projectId: "project-1",
      mode: "literature_review",
      sections: [
        {
          sectionType: "literature_review",
          ledgerEntryIds: ["ledger-1", "ledger-2"],
          instructions: "Focus on cardiovascular outcomes.",
        },
        {
          sectionId: "existing-section",
          sectionType: "literature_review",
          ledgerEntryIds: ["ledger-3"],
          targetWordCount: 500,
        },
      ],
    });

    const state = buildInitialState(parsed);
    expect(state.currentSectionIndex).toBe(0);
    expect(state.sections).toHaveLength(2);
    expect(state.sections[0]).toMatchObject({
      key: "literature_review-1",
      status: "pending",
      attempts: 0,
      ledgerEntryIds: ["ledger-1", "ledger-2"],
      draftSectionId: undefined,
    });
    expect(state.sections[1]).toMatchObject({
      key: "existing-section",
      status: "pending",
      attempts: 0,
      ledgerEntryIds: ["ledger-3"],
      draftSectionId: "existing-section",
    });
  });

  it("enqueues a compose job with queue payload and job record linkage", async () => {
    await enqueueComposeJob({
      projectId: "project-1",
      mode: "literature_review",
      sections: [
        {
          sectionType: "literature_review",
          ledgerEntryIds: ["ledger-1"],
        },
      ],
      requestId: "req-1",
    });

    expect(createJobRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        jobType: COMPOSE_JOB_TYPE,
      }),
    );

    expect(queues.default.add).toHaveBeenCalledWith(
      COMPOSE_QUEUE_JOB_NAME,
      expect.objectContaining({
        jobId: "job-123",
        sections: [
          expect.objectContaining({ ledgerEntryIds: ["ledger-1"] }),
        ],
      }),
      expect.objectContaining({
        jobId: "job-123",
      }),
    );

    expect(updateJobRecord).not.toHaveBeenCalled();
  });

  it("marks job as failed when queue enqueue throws", async () => {
    const addMock = queues.default.add as unknown as ReturnType<typeof vi.fn>;
    addMock.mockRejectedValueOnce(new Error("Queue offline"));

    await expect(() =>
      enqueueComposeJob({
        projectId: "project-1",
        mode: "literature_review",
        sections: [
          {
            sectionType: "literature_review",
            ledgerEntryIds: ["ledger-1"],
          },
        ],
      }),
    ).rejects.toThrow("Queue offline");

    expect(updateJobRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-123",
        status: "failed",
      }),
    );
  });
});
