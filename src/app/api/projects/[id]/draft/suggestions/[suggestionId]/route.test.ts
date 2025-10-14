import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const resolveMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/compose/suggestions", () => ({
  resolveDraftSuggestion: resolveMock,
}));

const params = {
  params: {
    id: "project-1",
    suggestionId: "suggestion-1",
  },
};

describe("Draft suggestion resolve API", () => {
  beforeEach(() => {
    resolveMock.mockReset();
  });

  it("accepts a suggestion", async () => {
    resolveMock.mockResolvedValue({
      id: "suggestion-1",
      projectId: "project-1",
      draftSectionId: "section-1",
      status: "accepted",
    });

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });

    const response = await POST(request, params);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.suggestion.status).toBe("accepted");
    expect(resolveMock).toHaveBeenCalledWith("suggestion-1", "accept", "user");
  });

  it("validates payload", async () => {
    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(400);
    expect(resolveMock).not.toHaveBeenCalled();
  });
});
