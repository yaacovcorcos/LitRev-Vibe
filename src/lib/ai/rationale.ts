import type { Candidate } from "@/hooks/use-candidates";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { RateLimiter } from "@/lib/search/rate-limiter";

const limiter = new RateLimiter(200);
const TRIAGE_MODEL = process.env.OPENAI_TRIAGE_MODEL ?? "gpt-4o-mini";

export type TriageRationale = {
  summary: string;
  bulletPoints: string[];
  confidence: "low" | "medium" | "high";
};

export type AskAiResponse = {
  answer: string;
  quotes: Array<{ text: string; source?: string }>;
};

type GenerateContext = {
  projectId: string;
  candidate: Pick<Candidate, "id" | "metadata" | "searchAdapter">;
};

enum Confidence {
  Low = "low",
  Medium = "medium",
  High = "high",
}

const CONFIDENCE_LEVELS = new Set<string>([
  Confidence.Low,
  Confidence.Medium,
  Confidence.High,
]);

export function isTriageRationale(value: unknown): value is TriageRationale {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.summary !== "string") {
    return false;
  }

  if (!Array.isArray(record.bulletPoints) || record.bulletPoints.some((item) => typeof item !== "string")) {
    return false;
  }

  if (typeof record.confidence !== "string" || !CONFIDENCE_LEVELS.has(record.confidence)) {
    return false;
  }

  return true;
}

export function isAskAiResponse(value: unknown): value is AskAiResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.answer !== "string") {
    return false;
  }

  if (!Array.isArray(record.quotes)) {
    return false;
  }

  return record.quotes.every((quote) => {
    if (!quote || typeof quote !== "object") {
      return false;
    }

    const scoped = quote as Record<string, unknown>;
    if (typeof scoped.text !== "string") {
      return false;
    }

    if (scoped.source !== undefined && typeof scoped.source !== "string") {
      return false;
    }

    return true;
  });
}

function sanitizeTitle(candidate: GenerateContext["candidate"]) {
  const title = (candidate.metadata?.title as string | undefined) ?? "candidate";
  return title.length > 140 ? `${title.slice(0, 137)}...` : title;
}

function buildCandidateContext(candidate: GenerateContext["candidate"]) {
  const metadata = candidate.metadata ?? {};
  const title = typeof metadata.title === "string" ? metadata.title : sanitizeTitle(candidate);
  const authorsArray = Array.isArray(metadata.authors)
    ? metadata.authors.filter((author): author is string => typeof author === "string")
    : [];
  const authors = authorsArray.length > 0 ? authorsArray.join(", ") : "";
  const journal = typeof metadata.journal === "string" ? metadata.journal : "";
  const year = typeof metadata.publishedAt === "string" ? metadata.publishedAt : "";
  const abstract = typeof metadata.abstract === "string" ? metadata.abstract : "";

  return {
    title,
    authors,
    journal,
    year,
    abstract,
  };
}

function parseJSON<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    return null;
  }
}

function fallbackRationale(candidate: GenerateContext["candidate"]): TriageRationale {
  const title = sanitizeTitle(candidate);
  return {
    summary: `"${title}" appears relevant based on keyword overlap and metadata. Revise once OpenAI integration is available in this environment.`,
    bulletPoints: [
      "Matches core search terms from the planning workspace.",
      "Review population, intervention, and study design manually.",
      "No automated integrity flags surfaced yet.",
    ],
    confidence: Confidence.Medium,
  } satisfies TriageRationale;
}

function extractAbstractQuotes(context: AskAiContext | GenerateContext, limit = 2): AskAiResponse["quotes"] {
  const metadata = context.candidate.metadata ?? {};
  const abstract = typeof metadata.abstract === "string" ? metadata.abstract : "";
  if (!abstract.trim()) {
    return [];
  }

  const sentences = abstract.match(/[^.!?]+[.!?]/g) ?? [abstract];
  const keywords = "question" in context
    ? context.question
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((keyword) => keyword.length > 3)
    : [];

  const scored = sentences
    .map((sentence) => {
      const lower = sentence.toLowerCase();
      const score = keywords.reduce((total, keyword) => (lower.includes(keyword) ? total + 1 : total), 0);
      return {
        sentence: sentence.trim(),
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length);

  return scored
    .slice(0, limit)
    .map((entry) => ({
      text: entry.sentence,
      source: "Abstract",
    }));
}

function fallbackAskResponse(context: AskAiContext, title: string): AskAiResponse {
  const quotes = extractAbstractQuotes(context, 2);
  return {
    answer: `Unable to contact OpenAI in this environment. When asked "${context.question}", the assistant would summarize "${title}" with supporting quotes once connectivity is available.`,
    quotes,
  } satisfies AskAiResponse;
}

export async function generateTriageRationale(context: GenerateContext): Promise<TriageRationale> {
  await limiter.wait();
  const client = getOpenAIClient();
  const fallback = fallbackRationale(context.candidate);

  if (!client) {
    return fallback;
  }

  const candidateContext = buildCandidateContext(context.candidate);

  try {
    const completion = await client.chat.completions.create({
      model: TRIAGE_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an evidence triage assistant summarizing academic references for medical literature reviews. Respond strictly in JSON matching the expected schema.",
        },
        {
          role: "user",
          content: [
            `Project ID: ${context.projectId}`,
            `Candidate ID: ${context.candidate.id}`,
            `Search adapter: ${context.candidate.searchAdapter}`,
            `Title: ${candidateContext.title}`,
            candidateContext.authors ? `Authors: ${candidateContext.authors}` : null,
            candidateContext.journal ? `Journal: ${candidateContext.journal}` : null,
            candidateContext.year ? `Published: ${candidateContext.year}` : null,
            candidateContext.abstract ? `Abstract: ${candidateContext.abstract}` : null,
            "Provide a JSON object with keys summary (string), bulletPoints (array of strings), and confidence (low|medium|high).",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return fallback;
    }

    const parsed = parseJSON<Record<string, unknown>>(content);
    if (isTriageRationale(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to generate triage rationale via OpenAI", error);
  }

  return fallback;
}

type AskAiContext = GenerateContext & {
  question: string;
};

export async function askCandidateQuestion(context: AskAiContext): Promise<AskAiResponse> {
  await limiter.wait();
  const title = sanitizeTitle(context.candidate);
  const client = getOpenAIClient();

  if (!client) {
    return fallbackAskResponse(context, title);
  }

  const candidateContext = buildCandidateContext(context.candidate);
  const fallbackQuotes = extractAbstractQuotes(context, 2);

  try {
    const completion = await client.chat.completions.create({
      model: TRIAGE_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You answer triage questions using the supplied reference context. Respond strictly in JSON with keys answer (string) and quotes (array of {text, source?}).",
        },
        {
          role: "user",
          content: [
            `Project ID: ${context.projectId}`,
            `Candidate ID: ${context.candidate.id}`,
            `Question: ${context.question}`,
            `Title: ${candidateContext.title}`,
            candidateContext.authors ? `Authors: ${candidateContext.authors}` : null,
            candidateContext.journal ? `Journal: ${candidateContext.journal}` : null,
            candidateContext.year ? `Published: ${candidateContext.year}` : null,
            candidateContext.abstract ? `Abstract: ${candidateContext.abstract}` : null,
            "Return JSON: { \"answer\": string, \"quotes\": [{ \"text\": string, \"source\"?: string }] }.",
            "If you cannot find supporting evidence, respond cautiously and return quotes as an empty array.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return fallbackAskResponse(context, title);
    }

    const parsed = parseJSON<Record<string, unknown>>(content);
    if (isAskAiResponse(parsed)) {
      if (parsed.quotes.length === 0 && fallbackQuotes.length > 0) {
        return {
          ...parsed,
          quotes: fallbackQuotes,
        } satisfies AskAiResponse;
      }
      return parsed;
    }
  } catch (error) {
    console.error("Failed to ask OpenAI about candidate", error);
  }

  if (fallbackQuotes.length > 0) {
    const fallback = fallbackAskResponse(context, title);
    return {
      ...fallback,
      quotes: fallbackQuotes,
    } satisfies AskAiResponse;
  }

  return fallbackAskResponse(context, title);
}
