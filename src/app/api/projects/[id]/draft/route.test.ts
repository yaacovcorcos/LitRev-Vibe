import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
  draftSection: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const params = {
  params: {
    id: "project-1",
  },
};

describe("GET /api/projects/:id/draft", () => {
  beforeEach(() => {
    prismaMock.project.findUnique.mockReset();
    prismaMock.draftSection.findMany.mockReset();
  });

  it("returns draft sections for a project", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });
    prismaMock.draftSection.findMany.mockResolvedValue([
      {
        id: "draft-1",
        projectId: "project-1",
        sectionType: "literature_review",
        content: { type: "doc", content: [] },
        status: "draft",
        version: 1,
        createdAt: new Date("2025-10-15T00:00:00Z"),
        updatedAt: new Date("2025-10-15T00:00:00Z"),
        approvedAt: null,
        citations: [
          {
            ledgerEntry: {
              id: "ledger-1",
              citationKey: "Smith2024",
              verifiedByHuman: true,
            },
          },
        ],
      },
    ]);

    const response = await GET(new Request("http://test.local"), params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sections).toHaveLength(1);
    expect(payload.sections[0]).toMatchObject({
      id: "draft-1",
      ledgerEntries: [
        {
          id: "ledger-1",
          citationKey: "Smith2024",
          verifiedByHuman: true,
        },
      ],
    });
  });

  it("returns 404 when project not found", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const response = await GET(new Request("http://test.local"), params);

    expect(response.status).toBe(404);
    expect(prismaMock.draftSection.findMany).not.toHaveBeenCalled();
  });
});
