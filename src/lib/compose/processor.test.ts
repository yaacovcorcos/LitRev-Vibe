import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  return {
    updateJobRecord: vi.fn(async () => ({})),
    logActivity: vi.fn(async () => ({})),
    assertCitationsValid: vi.fn(),
    ledgerFindMany: vi.fn(),
    transactionMock: vi.fn(),
    queueAdd: vi.fn(),
    jobFindUnique: vi.fn(async () => ({ resumableState: null })),
  };
});

vi.mock("@/lib/jobs", () => ({
  updateJobRecord: hoisted.updateJobRecord,
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: hoisted.logActivity,
}));

vi.mock("@/generated/prisma", () => ({
  Prisma: {
    JsonNull: null,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      findUnique: hoisted.jobFindUnique,
    },
    ledgerEntry: {
      findMany: hoisted.ledgerFindMany,
    },
    $transaction: hoisted.transactionMock,
  },
}));

vi.mock("@/lib/queue/queue", () => ({
  queues: {
    default: {
      add: hoisted.queueAdd,
    },
  },
}));

vi.mock("./citation-validator", () => ({
  assertCitationsValid: hoisted.assertCitationsValid,
}));

const {
  updateJobRecord,
  logActivity,
  assertCitationsValid,
  ledgerFindMany,
  transactionMock,
  queueAdd,
  jobFindUnique,
} = hoisted;

import { buildInitialState } from "./jobs";
import { processComposeJob } from "./processor";

function createTransactionClient(overrides: Record<string, unknown> = {}) {
  const draftSectionCreate = vi.fn(async () => ({
    id: "draft-1",
    projectId: "project-1",
    sectionType: "literature_review",
    content: {},
    status: "draft",
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
  }));

  const draftSectionUpdate = vi.fn(async () => ({
    id: "draft-1",
    projectId: "project-1",
    sectionType: "literature_review",
    content: {},
    status: "draft",
    version: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
  }));

  const draftSectionFindUnique = vi.fn(async () => null);
  const draftSectionOnLedgerDeleteMany = vi.fn(async () => ({ count: 1 }));
  const draftSectionOnLedgerCreateMany = vi.fn(async () => ({ count: 1 }));

  const client = {
    draftSection: {
      findUnique: draftSectionFindUnique,
      create: draftSectionCreate,
      update: draftSectionUpdate,
    },
    draftSectionOnLedger: {
      deleteMany: draftSectionOnLedgerDeleteMany,
      createMany: draftSectionOnLedgerCreateMany,
    },
    ...overrides,
  };

  return {
    client: client as unknown,
    mockFns: {
      draftSectionCreate,
      draftSectionUpdate,
      draftSectionFindUnique,
      draftSectionOnLedgerDeleteMany,
      draftSectionOnLedgerCreateMany,
    },
  };
}

describe("processComposeJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobFindUnique.mockResolvedValue({ resumableState: null });
  });

  it("generates draft sections and updates job progress", async () => {
    const composeInput = {
      projectId: "project-1",
      mode: "literature_review" as const,
      sections: [
        {
          sectionType: "literature_review" as const,
          ledgerEntryIds: ["ledger-1"],
          title: "Custom Literature Review",
        },
      ],
    };

    const payload = {
      ...composeInput,
      jobId: "job-1",
      state: buildInitialState(composeInput),
    };

    ledgerFindMany.mockResolvedValue([
      {
        id: "ledger-1",
        projectId: "project-1",
        citationKey: "Smith2020",
        metadata: { title: "Study A", journal: "Journal of Tests", publishedAt: "2020" },
        locators: [{ page: 5 }],
        verifiedByHuman: true,
      },
    ]);

    const { client, mockFns } = createTransactionClient();

    transactionMock.mockImplementation(async (executor: (tx: unknown) => Promise<unknown>) => executor(client));

    const result = await processComposeJob(payload);

    expect(result).toEqual({ completedSections: 1, totalSections: 1 });
    expect(ledgerFindMany).toHaveBeenCalledWith({
      where: { projectId: "project-1", id: { in: ["ledger-1"] } },
      select: {
        id: true,
        citationKey: true,
        metadata: true,
        locators: true,
        verifiedByHuman: true,
      },
    });
    expect(assertCitationsValid).toHaveBeenCalledTimes(1);
    expect(mockFns.draftSectionCreate).toHaveBeenCalledTimes(1);
    expect(updateJobRecord).toHaveBeenLastCalledWith(expect.objectContaining({ jobId: "job-1", status: "completed", progress: 1 }));
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "draft.section_generated",
        payload: expect.objectContaining({
          jobId: "job-1",
          ledgerEntryIds: ["ledger-1"],
        }),
      }),
    );
  });

  it("marks job as failed when ledger entries are missing", async () => {
    const composeInput = {
      projectId: "project-1",
      mode: "literature_review" as const,
      sections: [
        {
          sectionType: "literature_review" as const,
          ledgerEntryIds: ["missing-ledger"],
        },
      ],
    };

    const payload = {
      ...composeInput,
      jobId: "job-2",
      state: buildInitialState(composeInput),
    };

    ledgerFindMany.mockResolvedValue([]);

    const { client } = createTransactionClient();
    transactionMock.mockImplementation(async (executor: (tx: unknown) => Promise<unknown>) => executor(client));

    await expect(() => processComposeJob(payload)).rejects.toThrow(/Missing ledger entries/);

    expect(updateJobRecord).toHaveBeenLastCalledWith(
      expect.objectContaining({
        jobId: "job-2",
        status: "failed",
      }),
    );
    expect(logActivity).not.toHaveBeenCalled();
  });
});
