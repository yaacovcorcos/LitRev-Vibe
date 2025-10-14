import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LedgerEntry } from "@/hooks/use-ledger";
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
    id: "project-1",
    entryId: "entry-1",
  },
};

describe("POST /api/projects/:id/ledger/:entryId/locators", () => {
  beforeEach(() => {
    prismaMock.ledgerEntry.findUnique.mockReset();
    prismaMock.ledgerEntry.update.mockReset();
  });

  it("appends locator details and clears human verification", async () => {
    const existingEntry: LedgerEntry = {
      id: "entry-1",
      projectId: "project-1",
      citationKey: "smith2024",
      metadata: { title: "Example" },
      provenance: {},
      locators: [{ page: 2 }],
      integrityNotes: null,
      importedFrom: null,
      keptAt: new Date().toISOString(),
      verifiedByHuman: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedEntry = {
      ...existingEntry,
      locators: [...existingEntry.locators, { page: 3, note: "Key finding" }],
      verifiedByHuman: false,
    };

    prismaMock.ledgerEntry.findUnique.mockResolvedValue(existingEntry);
    prismaMock.ledgerEntry.update.mockResolvedValue(updatedEntry);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locator: {
          page: 3,
          note: "Key finding",
        },
      }),
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.ledgerEntry.update).toHaveBeenCalledWith({
      where: { id: existingEntry.id },
      data: {
        locators: [
          ...existingEntry.locators,
          { page: 3, note: "Key finding" },
        ],
        verifiedByHuman: false,
      },
    });
    expect(payload).toEqual(updatedEntry);
  });

  it("returns validation error when no locator details provided", async () => {
    const existingEntry = { id: "entry-1", projectId: "project-1" };
    prismaMock.ledgerEntry.findUnique.mockResolvedValue(existingEntry);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locator: {},
      }),
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toHaveProperty("error");
    expect(prismaMock.ledgerEntry.update).not.toHaveBeenCalled();
  });

  it("returns 404 when entry not found", async () => {
    prismaMock.ledgerEntry.findUnique.mockResolvedValue(null);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locator: {
          page: 1,
        },
      }),
    });

    const response = await POST(request, params);

    expect(response.status).toBe(404);
    expect(prismaMock.ledgerEntry.update).not.toHaveBeenCalled();
  });
});
