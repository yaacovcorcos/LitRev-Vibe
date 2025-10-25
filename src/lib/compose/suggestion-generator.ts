import { getOpenAIClient } from "@/lib/ai/openai-client";
import { RateLimiter } from "@/lib/search/rate-limiter";

const SUGGESTION_MODEL = process.env.OPENAI_SUGGESTION_MODEL ?? "gpt-4o-mini";
const limiter = new RateLimiter(200);

export type SuggestionModelInput = {
  projectId: string;
  sectionId: string;
  suggestionType: "improvement" | "clarity" | "expansion";
  narrativeVoice?: "neutral" | "confident" | "cautious";
  currentText: string;
  heading: string;
  verifiedCitations: string[];
};

export type SuggestionModelResult = {
  summary: string;
  diff: {
    type: "append_paragraph";
    before: string;
    after: string;
  };
  content: {
    type: string;
    content: Array<Record<string, unknown>>;
  };
};

type ModelResponse = {
  summary: string;
  paragraphs: string[];
};

export async function generateSuggestion(input: SuggestionModelInput): Promise<SuggestionModelResult> {
  const client = getOpenAIClient();
  const fallback = buildFallback(input);

  if (!client) {
    return fallback;
  }

  await limiter.wait();

  const prompt = buildPrompt(input);

  try {
    const completion = await client.chat.completions.create({
      model: SUGGESTION_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You revise sections of a medical literature review. Respond strictly in JSON with keys summary (string) and paragraphs (string[]). Each paragraph must cite at least one source using [citationKey] and align with the requested tone.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return fallback;
    }

    const parsed = safeJsonParse<ModelResponse>(content);
    if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.paragraphs) || parsed.paragraphs.length === 0) {
      return fallback;
    }

    return buildResult(input, parsed.summary, normalizeParagraphs(parsed.paragraphs));
  } catch (error) {
    console.error("Failed to generate draft suggestion via OpenAI", error);
    return fallback;
  }
}

function buildPrompt(input: SuggestionModelInput) {
  const parts: string[] = [
    `Project ID: ${input.projectId}`,
    `Draft section ID: ${input.sectionId}`,
    `Section heading: ${input.heading}`,
    `Suggestion type: ${input.suggestionType}`,
    `Narrative voice: ${describeNarrativeVoice(input.narrativeVoice ?? "neutral")}`,
    `Current section excerpt: ${truncate(input.currentText || "", 800)}`,
  ];

  if (input.verifiedCitations.length > 0) {
    parts.push(`Verified citations available: ${input.verifiedCitations.join(", ")}`);
  }

  parts.push(
    "Provide JSON: { \"summary\": string, \"paragraphs\": string[] }. Keep paragraphs concise, cite sources like [Smith2020], and highlight concrete improvements.",
  );

  return parts.join("\n");
}

function buildFallback(input: SuggestionModelInput): SuggestionModelResult {
  const baseBefore = input.currentText || "";
  const newParagraph = `${fallbackVoicePrefix(input.narrativeVoice)} the review should integrate stronger context from ${
    input.verifiedCitations.length > 0 ? input.verifiedCitations.join(", ") : "the verified sources"
  } to explain nuanced findings.`;

  return buildResult(input, "Provide clearer linkage between cited evidence and the section narrative.", [newParagraph]);
}

function buildResult(input: SuggestionModelInput, summary: string, paragraphs: string[]): SuggestionModelResult {
  const normalized = paragraphs.length > 0 ? paragraphs : [input.currentText || ""];
  const primary = normalized[0] ?? input.currentText;

  return {
    summary: summary.trim(),
    diff: {
      type: "append_paragraph",
      before: input.currentText,
      after: primary.trim(),
    },
    content: {
      type: "doc",
      content: normalized.map((paragraph) => ({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: paragraph.trim(),
          },
        ],
      })),
    },
  };
}

function describeNarrativeVoice(voice: "neutral" | "confident" | "cautious") {
  switch (voice) {
    case "confident":
      return "confident and assertive";
    case "cautious":
      return "cautious and nuanced";
    default:
      return "neutral and objective";
  }
}

function fallbackVoicePrefix(voice: SuggestionModelInput["narrativeVoice"]) {
  switch (voice) {
    case "confident":
      return "The evidence strongly suggests that";
    case "cautious":
      return "The available evidence indicates that";
    default:
      return "This section should clarify how";
  }
}

function normalizeParagraphs(values: string[]) {
  return values.map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0);
}

function safeJsonParse<T>(payload: string): T | null {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    return null;
  }
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}
