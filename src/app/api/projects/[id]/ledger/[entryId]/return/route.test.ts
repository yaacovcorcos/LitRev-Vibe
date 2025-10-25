import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const prismaMock = vi.hoisted(() => ({
  ledgerEntry: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  candidate: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation(async (ops) => {
    for (const op of ops) {
      await op;
    }
  }),
}));

const logActivityMock = vi.hoisted(() => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/activity-log", () => logActivityMock);

const params = {
  params: {
    id: "project-1",
    entryId: "entry-1",
  },
};

describe("POST /api/projects/:id/ledger/:entryId/return", () => {
  beforeEach(() => {
    prismaMock.ledgerEntry.findUnique.mockReset();
    prismaMock.ledgerEntry.delete.mockReset();
    prismaMock.candidate.findUnique.mockReset();
    prismaMock.candidate.update.mockReset();
    prismaMock.$transaction.mockClear();
    logActivityMock.logActivity.mockReset();
  });

  it("returns a kept ledger entry back to triage", async () => {
    prismaMock.ledgerEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      projectId: "project-1",
      candidateId: "candidate-1",
    });

    prismaMock.candidate.findUnique.mockResolvedValue({
      id: "candidate-1",
      projectId: "project-1",
      triageStatus: "kept",
    });

    prismaMock.$transaction.mockImplementation(async (callbacks) => {
      await Promise.all(callbacks);
    });

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "needs_review", note: "Missing locator" }),
    });

    prismaMock.ledgerEntry.delete.mockResolvedValue(undefined);
    prismaMock.candidate.update.mockResolvedValue({
      id: "candidate-1",
      triageStatus: "needs_review",
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.ledgerEntry.delete).toHaveBeenCalledWith({
      where: { id: "entry-1" },
    });
    expect(prismaMock.candidate.update).toHaveBeenCalledWith({
      where: { id: "candidate-1" },
      data: { triageStatus: "needs_review" },
    });
    expect(logActivityMock.logActivity).toHaveBeenCalledTimes(2);
    expect(payload).toEqual({ candidateId: "candidate-1", status: "needs_review" });
  });

  it("validates request body", async () => {
    prismaMock.ledgerEntry.findUnique.mockResolvedValue({
      id: "entry-1",
      projectId: "project-1",
      candidateId: "candidate-1",
    });
    prismaMock.candidate.findUnique.mockResolvedValue({
      id: "candidate-1",
      projectId: "project-1",
      triageStatus: "kept",
    });

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns 404 when ledger entry is missing", async () => {
    prismaMock.ledgerEntry.findUnique.mockResolvedValue(null);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(404);
  });
});
