process.env.REDIS_URL = "redis://localhost:0";
process.env.MOCK_REDIS = "1";

import { expect, test } from "@playwright/test";

import {
  calculateProgress,
  ensureSectionState,
  mergeStateWithPayload,
} from "@/lib/compose/processor";
import { composeJobStateSchema } from "@/lib/compose/jobs";

test.describe("compose job resumable state", () => {
  test("merges persisted state and maintains draft section ids", async () => {
    const payload = {
      projectId: "project-1",
      jobId: "job-1",
      mode: "literature_review" as const,
      state: composeJobStateSchema.parse({
        currentSectionIndex: 0,
        sections: [
          {
            key: "literature_review-1",
            sectionType: "literature_review" as const,
            ledgerEntryIds: ["ledger-1"],
            status: "pending" as const,
            attempts: 0,
          },
          {
            key: "literature_review-2",
            sectionType: "literature_review" as const,
            ledgerEntryIds: ["ledger-2"],
            status: "pending" as const,
            attempts: 0,
          },
        ],
      }),
      sections: [
        {
          sectionType: "literature_review" as const,
          ledgerEntryIds: ["ledger-1"],
        },
        {
          sectionType: "literature_review" as const,
          ledgerEntryIds: ["ledger-2"],
        },
      ],
    } satisfies Parameters<typeof mergeStateWithPayload>[1];

    const persistedState = mergeStateWithPayload(payload.state, payload);

    // Simulate first section completing and persisting draft ID
    const firstSection = ensureSectionState(persistedState, payload.sections[0], 0);
    firstSection.status = "completed";
    firstSection.draftSectionId = "draft-1";

    // Simulate retry payload without explicit sectionId
    const resumedState = mergeStateWithPayload(persistedState, payload);
    const resumedFirstSection = ensureSectionState(resumedState, payload.sections[0], 0);

    expect(resumedFirstSection.draftSectionId).toBe("draft-1");
    expect(resumedFirstSection.status).toBe("completed");

    const progress = calculateProgress(resumedState, payload.sections.length);
    expect(progress).toBeGreaterThan(0.4);
  });
});
