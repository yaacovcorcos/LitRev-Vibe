import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const versionsMock = vi.hoisted(() => ({
  listDraftSectionVersions: vi.fn(),
  rollbackDraftSection: vi.fn(),
}));

vi.mock("@/lib/compose/versions", () => ({
  listDraftSectionVersions: versionsMock.listDraftSectionVersions,
  rollbackDraftSection: versionsMock.rollbackDraftSection,
}));

const params = {
  params: {
    id: "project-1",
    sectionId: "section-1",
  },
};

describe("Draft section versions API", () => {
  beforeEach(() => {
    versionsMock.listDraftSectionVersions.mockReset();
    versionsMock.rollbackDraftSection.mockReset();
  });

  it("returns version list", async () => {
    versionsMock.listDraftSectionVersions.mockResolvedValue([
      {
        id: "version-1",
        draftSectionId: "section-1",
        version: 1,
        status: "draft",
        content: {},
        createdAt: new Date("2025-10-15T00:00:00Z"),
      },
    ]);

    const response = await GET(new Request("http://test.local"), params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.versions).toHaveLength(1);
    expect(versionsMock.listDraftSectionVersions).toHaveBeenCalledWith("project-1", "section-1");
  });

  it("rolls back to selected version", async () => {
    versionsMock.rollbackDraftSection.mockResolvedValue({
      id: "section-1",
      version: 3,
      status: "draft",
      content: {},
    });

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 2 }),
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.section.version).toBe(3);
    expect(versionsMock.rollbackDraftSection).toHaveBeenCalledWith("project-1", "section-1", 2);
  });

  it("validates rollback payload", async () => {
    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(400);
    expect(versionsMock.rollbackDraftSection).not.toHaveBeenCalled();
  });
});
