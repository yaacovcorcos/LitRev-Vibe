import { beforeEach, describe, expect, it, vi } from "vitest";

const openAIMock = vi.hoisted(() => ({
  getOpenAIClient: vi.fn(),
}));

vi.mock("@/lib/ai/openai-client", () => ({
  getOpenAIClient: openAIMock.getOpenAIClient,
}));

vi.mock("@/lib/search/rate-limiter", () => ({
  RateLimiter: class {
    async wait() {
      return;
    }
  },
}));

import { generateSuggestion } from "./suggestion-generator";

const baseInput = {
  projectId: "project-1",
  sectionId: "section-1",
  suggestionType: "improvement" as const,
  narrativeVoice: "neutral" as const,
  currentText: "Baseline paragraph [Smith2020]",
  heading: "Results",
  verifiedCitations: ["Smith2020"],
};

describe("suggestion generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openAIMock.getOpenAIClient.mockReturnValue(null);
  });

  it("returns fallback suggestion when OpenAI is unavailable", async () => {
    const result = await generateSuggestion(baseInput);

    expect(result.summary).toContain("linkage");
    expect(result.diff.after).toContain("Smith2020");
  });

  it("parses OpenAI output when valid JSON is returned", async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "Clarify linkage to Smith2020.",
              paragraphs: ["This section should detail the Smith2020 outcomes [Smith2020]."],
            }),
          },
        },
      ],
    });

    openAIMock.getOpenAIClient.mockReturnValue({
      chat: {
        completions: {
          create: createMock,
        },
      },
    });

    const result = await generateSuggestion(baseInput);

    expect(createMock).toHaveBeenCalledOnce();
    expect(result.summary).toBe("Clarify linkage to Smith2020.");
    expect(result.content.content[0]).toMatchObject({
      type: "paragraph",
      content: [expect.objectContaining({ text: expect.stringContaining("Smith2020") })],
    });
  });

  it("falls back when OpenAI returns malformed JSON", async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: "not-json",
          },
        },
      ],
    });

    openAIMock.getOpenAIClient.mockReturnValue({
      chat: {
        completions: {
          create: createMock,
        },
      },
    });

    const result = await generateSuggestion(baseInput);

    expect(result.diff.after).toContain("Smith2020");
  });
});
