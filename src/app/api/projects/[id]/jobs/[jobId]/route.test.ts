import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getJobByIdMock: vi.fn(),
}));

vi.mock("@/lib/jobs", () => ({
  getJobById: hoisted.getJobByIdMock,
}));

import { GET } from "./route";

const params = {
  params: {
    id: "project-1",
    jobId: "job-1",
  },
};

describe("GET /api/projects/:id/jobs/:jobId", () => {
  beforeEach(() => {
    hoisted.getJobByIdMock.mockReset();
  });

  it("returns job when found", async () => {
    const job = {
      id: "job-1",
      projectId: "project-1",
      jobType: "compose.literature_review",
      status: "in_progress",
      progress: 0.5,
      logs: {},
      resumableState: {},
      createdAt: "2025-10-14T17:10:31.234Z",
      updatedAt: "2025-10-14T17:10:31.234Z",
    };

    hoisted.getJobByIdMock.mockResolvedValue(job);

    const response = await GET(new Request("http://test.local"), params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual(job);
  });

  it("returns 404 when job missing or belongs to another project", async () => {
    hoisted.getJobByIdMock.mockResolvedValue(null);

    const responseMissing = await GET(new Request("http://test.local"), params);
    expect(responseMissing.status).toBe(404);

    hoisted.getJobByIdMock.mockResolvedValue({
      id: "job-2",
      projectId: "another-project",
    });

    const responseMismatch = await GET(new Request("http://test.local"), params);
    expect(responseMismatch.status).toBe(404);
  });
});
