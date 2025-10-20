import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  job: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("GET /api/jobs", () => {
  beforeEach(() => {
    prismaMock.job.findMany.mockReset();
  });

  it("returns job list", async () => {
    prismaMock.job.findMany.mockResolvedValue([
      {
        id: "job-1",
        projectId: "project-1",
        jobType: "compose.literature_review",
        status: "in_progress",
        progress: 0.5,
        logs: {},
        resumableState: {},
        workerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
    ]);

    const response = await GET(new Request("http://test.local/api/jobs"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.jobs).toHaveLength(1);
    expect(prismaMock.job.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 25,
    }));
  });

  it("validates query params", async () => {
    const response = await GET(new Request("http://test.local/api/jobs?limit=abc"));
    expect(response.status).toBe(400);
    expect(prismaMock.job.findMany).not.toHaveBeenCalled();
  });
});
