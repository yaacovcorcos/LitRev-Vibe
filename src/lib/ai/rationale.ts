import type { Candidate } from "@/hooks/use-candidates";
import { RateLimiter } from "@/lib/search/rate-limiter";

const limiter = new RateLimiter(200);

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

export async function generateTriageRationale(context: GenerateContext): Promise<TriageRationale> {
  await limiter.wait();

  const title = sanitizeTitle(context.candidate);

  return {
    summary: `The AI review placeholder suggests that "${title}" is potentially relevant based on keyword overlap and study design metadata. Integrate real provider output once the Claude integration is ready.`,
    bulletPoints: [
      "Matches core search terms from the planning workspace.",
      "Metadata indicates human study; verify population alignment.",
      "No integrity flags have been detected yet.",
    ],
    confidence: Confidence.Medium,
  } satisfies TriageRationale;
}

type AskAiContext = GenerateContext & {
  question: string;
};

export async function askCandidateQuestion(context: AskAiContext): Promise<AskAiResponse> {
  await limiter.wait();
  const title = sanitizeTitle(context.candidate);

  return {
    answer: `Stubbed response: when asked "${context.question}", the AI would analyze \"${title}\" and respond with grounded snippets once connected to the provider.`,
    quotes: [
      {
        text: "Real quotes will appear here once PDF ingestion and provider streaming are enabled.",
      },
    ],
  } satisfies AskAiResponse;
}
