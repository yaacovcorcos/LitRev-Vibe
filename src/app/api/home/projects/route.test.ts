import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  project: {
    findMany: vi.fn(),
  },
  ledgerEntry: {
    groupBy: vi.fn(),
  },
  draftSection: {
    groupBy: vi.fn(),
  },
  job: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("GET /api/home/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        name: "Cardio Review",
        description: "Lifestyle interventions",
        settings: {
          exports: {
            enabledFormats: ["docx"],
            defaultFormat: "docx",
            includePrismaDiagram: true,
            includeLedgerExport: true,
          },
          home: { pinned: true },
          locatorPolicy: "strict",
          citationStyle: "apa",
        },
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);

    prismaMock.ledgerEntry.groupBy.mockResolvedValue([
      { projectId: "project-1", _count: { _all: 12 } },
    ]);

    prismaMock.draftSection.groupBy.mockImplementation(async ({ where, _count }) => {
      if (where?.status === "approved") {
        return [{ projectId: "project-1", _count: { _all: 3 } }];
      }
      return [{ projectId: "project-1", _count: { _all: 5 } }];
    });

    prismaMock.job.groupBy.mockResolvedValue([
      { projectId: "project-1", _count: { _all: 1 } },
    ]);

    prismaMock.job.findMany.mockResolvedValue([
      {
        projectId: "project-1",
        status: "completed",
        completedAt: new Date("2024-01-01T01:00:00Z"),
      },
    ]);
  });

  it("returns aggregated project summaries", async () => {
    const response = await GET(new Request("http://test.local"));
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(Array.isArray(json.projects)).toBe(true);
    expect(json.projects[0]).toMatchObject({
      id: "project-1",
      name: "Cardio Review",
      ledgerCount: 12,
      draft: { total: 5, approved: 3, percent: 60 },
      runs: { active: 1, lastStatus: "completed" },
      pinned: true,
    });
  });

  it("honors the limit parameter", async () => {
    await GET(new Request("http://test.local?limit=2"));
    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 2 }),
    );
  });

  it("returns empty array when no projects", async () => {
    prismaMock.project.findMany.mockResolvedValueOnce([]);

    const response = await GET(new Request("http://test.local"));
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.projects).toEqual([]);
  });
});
