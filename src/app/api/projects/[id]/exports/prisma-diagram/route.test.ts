import { beforeEach, describe, expect, it, vi } from "vitest";

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
  getPrismaFlowMetrics: (...args: unknown[]) => metricsMock(...args),
}));

describe("GET /api/projects/:id/exports/prisma-diagram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when project is missing", async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://test.local"), {
      params: { id: "missing" },
    });

    expect(response.status).toBe(404);
  });

  it("returns SVG diagram when project exists", async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce({ id: "project-1" });
    metricsMock.mockResolvedValueOnce({
      totalIdentified: 150,
      totalStored: 70,
      candidateCounts: {
        pending: 5,
        kept: 30,
        discarded: 35,
        needs_review: 0,
      },
      screened: 60,
      included: 25,
      pending: 5,
      lastSearchCompletedAt: new Date("2024-01-01T00:00:00Z"),
    });

    const response = await GET(new Request("http://test.local"), {
      params: { id: "project-1" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    const body = await response.text();
    expect(body).toContain("PRISMA flow diagram");
    expect(body).toContain("150");
    expect(metricsMock).toHaveBeenCalledWith("project-1");
  });
});
