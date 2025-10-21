import { describe, expect, it, beforeEach, vi } from "vitest";

import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
}));

const metricsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/metrics/prisma-flow", () => ({
  getPrismaFlowMetrics: metricsMock,
}));

const params = {
  params: {
    id: "project-1",
  },
};

describe("GET /api/projects/:id/exports/metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });
    metricsMock.mockResolvedValue({
      totalIdentified: 50,
      totalStored: 30,
      candidateCounts: {
        pending: 10,
        kept: 15,
        discarded: 5,
        needs_review: 0,
      },
      screened: 25,
      included: 10,
      pending: 10,
      lastSearchCompletedAt: new Date("2024-01-01T00:00:00Z"),
    });
  });

  it("returns 404 if project missing", async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce(null);
    const response = await GET(new Request("http://test.local"), params);
    expect(response.status).toBe(404);
  });

  it("returns metrics payload", async () => {
    const response = await GET(new Request("http://test.local"), params);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.metrics).toMatchObject({ totalIdentified: 50, screened: 25, included: 10 });
    expect(metricsMock).toHaveBeenCalledWith("project-1");
  });
});
