import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const prismaMock = vi.hoisted(() => ({
  ledgerEntry: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const params = {
  params: {
    id: "project-42",
    entryId: "entry-99",
  },
};

describe("POST /api/projects/:id/ledger/:entryId/verify", () => {
  beforeEach(() => {
    prismaMock.ledgerEntry.findUnique.mockReset();
    prismaMock.ledgerEntry.update.mockReset();
  });

  it("marks a ledger entry as human verified", async () => {
    const entry = {
      id: "entry-99",
      projectId: "project-42",
      verifiedByHuman: false,
    };

    const updated = { ...entry, verifiedByHuman: true };

    prismaMock.ledgerEntry.findUnique.mockResolvedValue(entry);
    prismaMock.ledgerEntry.update.mockResolvedValue(updated);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: true }),
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.ledgerEntry.update).toHaveBeenCalledWith({
      where: { id: entry.id },
      data: { verifiedByHuman: true },
    });
    expect(payload).toEqual(updated);
  });

  it("returns a 400 response when payload is invalid", async () => {
    const entry = {
      id: "entry-99",
      projectId: "project-42",
      verifiedByHuman: false,
    };
    prismaMock.ledgerEntry.findUnique.mockResolvedValue(entry);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toHaveProperty("error");
    expect(prismaMock.ledgerEntry.update).not.toHaveBeenCalled();
  });

  it("returns 404 when entry is missing", async () => {
    prismaMock.ledgerEntry.findUnique.mockResolvedValue(null);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: true }),
    });

    const response = await POST(request, params);

    expect(response.status).toBe(404);
    expect(prismaMock.ledgerEntry.update).not.toHaveBeenCalled();
  });
});
