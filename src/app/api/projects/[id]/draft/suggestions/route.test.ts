import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const suggestionsMock = vi.hoisted(() => ({
  listDraftSuggestions: vi.fn(),
  createDraftSuggestion: vi.fn(),
}));

vi.mock("@/lib/compose/suggestions", () => ({
  listDraftSuggestions: suggestionsMock.listDraftSuggestions,
  createDraftSuggestion: suggestionsMock.createDraftSuggestion,
}));

const params = {
  params: {
    id: "project-1",
  },
};

describe("Draft suggestion list & create API", () => {
  beforeEach(() => {
    suggestionsMock.listDraftSuggestions.mockReset();
    suggestionsMock.createDraftSuggestion.mockReset();
  });

  it("lists suggestions", async () => {
    suggestionsMock.listDraftSuggestions.mockResolvedValue([
      {
        id: "suggestion-1",
        projectId: "project-1",
        draftSectionId: "section-1",
        suggestionType: "improvement",
        summary: "Add more detail",
        diff: {},
        content: {},
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
        resolvedBy: null,
      },
    ]);

    const response = await GET(new Request("http://test.local"), params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.suggestions).toHaveLength(1);
    expect(suggestionsMock.listDraftSuggestions).toHaveBeenCalledWith("project-1", undefined);
  });

  it("creates a suggestion", async () => {
    suggestionsMock.createDraftSuggestion.mockResolvedValue({
      id: "suggestion-2",
      projectId: "project-1",
      draftSectionId: "section-1",
      suggestionType: "improvement",
      summary: "Add more detail",
      diff: {},
      content: {},
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
      resolvedBy: null,
    });

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draftSectionId: "section-1",
      }),
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.suggestion.id).toBe("suggestion-2");
    expect(suggestionsMock.createDraftSuggestion).toHaveBeenCalledWith({
      projectId: "project-1",
      draftSectionId: "section-1",
      suggestionType: "improvement",
    });
  });

  it("validates payload", async () => {
    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(400);
    expect(suggestionsMock.createDraftSuggestion).not.toHaveBeenCalled();
  });
});
