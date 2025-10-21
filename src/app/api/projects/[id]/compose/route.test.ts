import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
}));

const enqueueComposeJobMock = vi.hoisted(() =>
  vi.fn(async () => ({
    id: "job-123",
    projectId: "project-1",
    jobType: "compose.literature_review",
    status: "queued",
    progress: 0,
    logs: null,
    resumableState: null,
    workerId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  })),
);

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/compose/jobs", async () => {
  const { z } = await import("zod");

  const sectionSchema = z.object({
    sectionId: z.string().optional(),
    sectionType: z.enum([
      "literature_review",
      "introduction",
      "methods",
      "results",
      "discussion",
      "conclusion",
      "custom",
    ]),
    title: z.string().min(1).optional(),
    instructions: z.string().optional(),
    outline: z.array(z.string().min(1)).max(12).optional(),
    ledgerEntryIds: z.array(z.string()).min(1),
    targetWordCount: z.number().int().min(100).max(4000).optional(),
  });

  const composeJobInputSchema = z.object({
    projectId: z.string(),
    mode: z.literal("literature_review"),
    sections: z.array(sectionSchema).min(1),
    researchQuestion: z.string().optional(),
    narrativeVoice: z.enum(["neutral", "confident", "cautious"]).optional(),
    requestId: z.string().optional(),
  });

  return {
    composeJobInputSchema,
    enqueueComposeJob: enqueueComposeJobMock,
  } satisfies Partial<typeof import("@/lib/compose/jobs")>;
});

const params = {
  params: {
    id: "project-1",
  },
};

describe("POST /api/projects/:id/compose", () => {
  beforeEach(() => {
    prismaMock.project.findUnique.mockReset();
    enqueueComposeJobMock.mockReset();
    enqueueComposeJobMock.mockResolvedValue({
      id: "job-123",
      projectId: "project-1",
      jobType: "compose.literature_review",
      status: "queued",
      progress: 0,
      logs: null,
      resumableState: null,
      workerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    });
  });

  it("enqueues compose job and returns job id", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });

    const payload = {
      mode: "literature_review" as const,
      sections: [
        {
          sectionType: "literature_review" as const,
          ledgerEntryIds: ["ledger-1", "ledger-2"],
        },
      ],
      narrativeVoice: "neutral" as const,
      researchQuestion: "How effective are interventions?",
    };

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await POST(request, params);
    const { jobId } = await response.json();

    expect(response.status).toBe(202);
    expect(jobId).toBe("job-123");
    expect(enqueueComposeJobMock).toHaveBeenCalledWith({
      ...payload,
      projectId: "project-1",
    });
  });

  it("returns validation error when payload invalid", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, params);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error");
    expect(enqueueComposeJobMock).not.toHaveBeenCalled();
  });

  it("returns 404 when project missing", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "literature_review",
        sections: [
          {
            sectionType: "literature_review",
            ledgerEntryIds: ["ledger-1"],
          },
        ],
      }),
    });

    const response = await POST(request, params);

    expect(response.status).toBe(404);
    expect(enqueueComposeJobMock).not.toHaveBeenCalled();
  });
});
