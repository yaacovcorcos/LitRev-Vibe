import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "./route";

const prismaMock = vi.hoisted(() => ({
  draftSection: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  draftSectionVersion: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/compose/versions", () => ({
  ensureDraftSectionVersion: vi.fn(async (_client, section) => {
    prismaMock.draftSectionVersion.findUnique.mockResolvedValueOnce(section);
  }),
  recordDraftSectionVersion: vi.fn(async (_client, section) => {
    await prismaMock.draftSectionVersion.create(section);
  }),
}));

const params = {
  params: {
    id: "project-1",
    sectionId: "section-1",
  },
};

describe("PATCH /api/projects/:id/draft/:sectionId", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    prismaMock.draftSection.findFirst.mockResolvedValue({
      id: "section-1",
      projectId: "project-1",
      content: { type: "doc" },
      status: "draft",
      version: 1,
      approvedAt: null,
    });
    prismaMock.draftSection.update.mockResolvedValue({
      id: "section-1",
      projectId: "project-1",
      content: { type: "doc", content: [] },
      status: "draft",
      version: 2,
      approvedAt: null,
    });
    prismaMock.draftSectionVersion.findUnique.mockResolvedValue(null);
  });

  it("updates section content and increments version", async () => {
    const request = new Request("http://test.local", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { type: "doc", content: [] } }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.version).toBe(2);
    expect(prismaMock.draftSection.update).toHaveBeenCalled();
  });

  it("approves a draft section", async () => {
    prismaMock.draftSection.update.mockResolvedValue({
      id: "section-1",
      projectId: "project-1",
      content: { type: "doc", content: [] },
      status: "approved",
      version: 1,
      approvedAt: new Date("2025-01-01"),
    });

    const request = new Request("http://test.local", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("approved");
  });

  it("returns 400 when payload invalid", async () => {
    const request = new Request("http://test.local", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "unknown" }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(400);
  });

  it("returns 400 when section missing", async () => {
    prismaMock.draftSection.findFirst.mockResolvedValueOnce(null);

    const request = new Request("http://test.local", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { type: "doc" } }),
    });

    const response = await PATCH(request, params);
    expect(response.status).toBe(400);
  });
});
