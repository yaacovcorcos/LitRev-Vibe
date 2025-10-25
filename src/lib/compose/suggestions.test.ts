import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  draftSection: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  draftSuggestion: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const logActivityMock = vi.hoisted(() => vi.fn());
const versionsMock = vi.hoisted(() => ({
  ensureDraftSectionVersion: vi.fn(),
  recordDraftSectionVersion: vi.fn(),
}));

const generatorMock = vi.hoisted(() => ({
  generateSuggestion: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: logActivityMock,
}));

vi.mock("@/lib/compose/versions", () => ({
  ensureDraftSectionVersion: versionsMock.ensureDraftSectionVersion,
  recordDraftSectionVersion: versionsMock.recordDraftSectionVersion,
}));

vi.mock("./suggestion-generator", () => ({
  generateSuggestion: generatorMock.generateSuggestion,
}));

import { createDraftSuggestion, resolveDraftSuggestion } from "./suggestions";

describe("draft suggestions helpers", () => {
  beforeEach(() => {
    Object.values(prismaMock).forEach((value) => {
      if (typeof value === "function") {
        value.mockReset();
      } else if (value && typeof value === "object") {
        Object.values(value).forEach((fn) => {
          if (typeof fn === "function") {
            fn.mockReset();
          }
        });
      }
    });
    logActivityMock.mockReset();
    versionsMock.ensureDraftSectionVersion.mockReset();
    versionsMock.recordDraftSectionVersion.mockReset();
    generatorMock.generateSuggestion.mockReset();
  });

  it("creates a suggestion with appended paragraph", async () => {
    prismaMock.draftSection.findUnique.mockResolvedValue({
      id: "section-1",
      projectId: "project-1",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Baseline paragraph." }] },
        ],
      },
      citations: [
        {
          ledgerEntry: {
            id: "ledger-1",
            citationKey: "Smith2024",
            verifiedByHuman: true,
          },
        },
      ],
    });

    generatorMock.generateSuggestion.mockResolvedValue({
      summary: "Clarify how Smith2024 informs the outcome narrative.",
      diff: {
        type: "append_paragraph",
        before: "Baseline paragraph.",
        after: "This section should clarify how Smith2024 strengthens the findings [Smith2024].",
      },
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This section should clarify how Smith2024 strengthens the findings [Smith2024].",
              },
            ],
          },
        ],
      },
    });

    prismaMock.draftSuggestion.create.mockImplementation(async ({ data }) => ({
      ...data,
      id: "suggestion-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "pending",
      resolvedAt: null,
      resolvedBy: null,
    }));

    const suggestion = await createDraftSuggestion({
      projectId: "project-1",
      draftSectionId: "section-1",
      suggestionType: "improvement",
    });

    expect(generatorMock.generateSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        sectionId: "section-1",
        suggestionType: "improvement",
        verifiedCitations: ["Smith2024"],
      }),
    );
    expect(prismaMock.draftSuggestion.create).toHaveBeenCalled();
    expect(suggestion.id).toBe("suggestion-1");
    expect(logActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "draft.suggestion_created",
    }));
  });

  it("accepts a suggestion and updates the section", async () => {
    const suggestionRecord = {
      id: "suggestion-1",
      projectId: "project-1",
      draftSectionId: "section-1",
      suggestionType: "improvement",
      summary: "",
      diff: {},
      content: { type: "doc", content: [] },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
      section: {
        id: "section-1",
        version: 1,
      },
    } as const;

    prismaMock.draftSuggestion.findUnique.mockResolvedValueOnce(suggestionRecord);

    prismaMock.$transaction.mockImplementation(async (callback) => {
      await callback({
        draftSection: prismaMock.draftSection,
        draftSuggestion: prismaMock.draftSuggestion,
      } as unknown as Parameters<typeof callback>[0]);
    });

    prismaMock.draftSection.findUnique.mockResolvedValue({
      id: "section-1",
      projectId: "project-1",
      content: {},
      status: "draft",
      version: 1,
    });

    prismaMock.draftSection.update.mockResolvedValue({
      id: "section-1",
      projectId: "project-1",
      content: {},
      status: "draft",
      version: 2,
    });

    prismaMock.draftSuggestion.findUnique.mockResolvedValueOnce({
      ...suggestionRecord,
      status: "accepted",
      resolvedAt: new Date(),
    });

    const result = await resolveDraftSuggestion("suggestion-1", "accept", "user-1");

    expect(prismaMock.draftSection.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "section-1" },
    }));
    expect(prismaMock.draftSuggestion.update).toHaveBeenCalled();
    expect(result?.status).toBe("accepted");
    expect(logActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "draft.suggestion_accepted",
    }));
    expect(versionsMock.ensureDraftSectionVersion).toHaveBeenCalled();
    expect(versionsMock.recordDraftSectionVersion).toHaveBeenCalled();
  });

  it("dismisses a suggestion without updating the draft section", async () => {
    prismaMock.draftSuggestion.findUnique.mockResolvedValueOnce({
      id: "suggestion-2",
      projectId: "project-1",
      draftSectionId: "section-1",
      suggestionType: "clarity",
      summary: "",
      diff: {},
      content: { type: "doc", content: [] },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
      section: {
        id: "section-1",
        version: 1,
      },
    });

    prismaMock.draftSuggestion.update.mockResolvedValue({
      id: "suggestion-2",
      projectId: "project-1",
      draftSectionId: "section-1",
      suggestionType: "clarity",
      summary: "",
      diff: {},
      content: { type: "doc", content: [] },
      status: "dismissed",
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: new Date(),
      resolvedBy: "user-1",
      section: {
        id: "section-1",
        version: 1,
      },
    });

    prismaMock.draftSuggestion.findUnique.mockResolvedValueOnce({
      id: "suggestion-2",
      projectId: "project-1",
      draftSectionId: "section-1",
      suggestionType: "clarity",
      summary: "",
      diff: {},
      content: { type: "doc", content: [] },
      status: "dismissed",
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: new Date(),
      resolvedBy: "user-1",
    });

    const result = await resolveDraftSuggestion("suggestion-2", "dismiss", "user-1");

    expect(prismaMock.draftSection.update).not.toHaveBeenCalled();
    expect(result?.status).toBe("dismissed");
    expect(logActivityMock).toHaveBeenCalledWith(expect.objectContaining({
      action: "draft.suggestion_dismissed",
    }));
  });
});
