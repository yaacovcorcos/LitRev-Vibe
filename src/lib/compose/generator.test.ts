import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  return {
    getOpenAIClient: vi.fn<() => unknown, []>(() => null),
  };
});

vi.mock("@/lib/ai/openai-client", () => ({
  getOpenAIClient: hoisted.getOpenAIClient,
}));

vi.mock("@/lib/search/rate-limiter", () => ({
  RateLimiter: class {
    async wait() {
      return;
    }
  },
}));

import { generateComposeDocument } from "./generator";

describe("generateComposeDocument", () => {
  const baseInput = {
    projectId: "project-1",
    section: {
      sectionType: "literature_review" as const,
      ledgerEntryIds: ["ledger-1"],
    },
    researchQuestion: "What is the impact of intervention X?",
    narrativeVoice: "neutral" as const,
    ledgerEntries: [
      {
        id: "ledger-1",
        citationKey: "Smith2020",
        metadata: {
          title: "Effects of Intervention X on Blood Pressure",
          journal: "Journal of Trials",
          publishedAt: "2020",
          abstract: "This randomized trial evaluated intervention X in 200 patients across two centers.",
        },
        locators: [
          {
            page: 5,
            note: "Primary outcome at 12 weeks",
          },
        ],
        verifiedByHuman: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getOpenAIClient.mockReturnValue(null);
  });

  it("returns fallback document when OpenAI is unavailable", async () => {
    const doc = await generateComposeDocument(baseInput);

    expect(doc.type).toBe("doc");
    expect(doc.content[0]).toMatchObject({
      type: "heading",
      content: [{ type: "text", text: "Literature Review" }],
    });
    expect(doc.content[1]).toMatchObject({ type: "paragraph" });
  });

  it("parses model output when OpenAI returns valid JSON", async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              heading: "Evidence Summary",
              paragraphs: ["Paragraph one [Smith2020]", "Paragraph two [Smith2020]"],
            }),
          },
        },
      ],
    });

    const client = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    };

    hoisted.getOpenAIClient.mockReturnValue(client);

    const doc = await generateComposeDocument(baseInput);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(doc.content[0]).toMatchObject({
      type: "heading",
      content: [{ type: "text", text: "Evidence Summary" }],
    });
    expect(doc.content[1]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Paragraph one [Smith2020]" }],
    });
    expect(doc.content[2]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Paragraph two [Smith2020]" }],
    });
  });

  it("falls back when model output is invalid", async () => {
    const createMock = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: "not json",
          },
        },
      ],
    });

    const client = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    };

    hoisted.getOpenAIClient.mockReturnValue(client);

    const doc = await generateComposeDocument(baseInput);

    expect(doc.content[0]).toMatchObject({
      type: "heading",
      content: [{ type: "text", text: "Literature Review" }],
    });
  });
});
