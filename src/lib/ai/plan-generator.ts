import type { ResearchPlanContent } from "@/lib/planning/plan";
import { DEFAULT_PLAN } from "@/lib/planning/plan";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { RateLimiter } from "@/lib/search/rate-limiter";

const PLAN_MODEL = process.env.OPENAI_PLAN_MODEL ?? "gpt-4o-mini";
const limiter = new RateLimiter(100);
const DEFAULT_SOURCES = ["pubmed", "crossref"];

export type GeneratedPlanSuggestion = ResearchPlanContent & {
  targetSources: string[];
  rationale?: string;
};

type PlanContext = {
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  currentPlan?: ResearchPlanContent | null;
  overrides?: Partial<ResearchPlanContent>;
};

type ModelJsonShape = {
  scope?: string;
  questions?: string[] | string;
  queryStrategy?: {
    summary?: string;
    booleanString?: string;
    filters?: string[];
    sources?: string[];
    notes?: string;
    steps?: string[];
    raw?: string;
  } | string;
  outline?: Array<
    | string
    | {
        heading?: string;
        summary?: string;
        bullets?: string[];
      }
  >;
  targetSources?: string[];
  rationale?: string;
};

function toBulletList(items: string[]): string {
  return items.map((item) => (item.startsWith("-") ? item.trim() : `- ${item.trim()}`)).join("\n");
}

function normalizeQuestions(value: ModelJsonShape["questions"]): string {
  if (!value) {
    return DEFAULT_PLAN.questions;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  const filtered = value.filter((item) => typeof item === "string" && item.trim().length > 0) as string[];
  if (filtered.length === 0) {
    return DEFAULT_PLAN.questions;
  }

  return toBulletList(filtered);
}

function normalizeQueryStrategy(value: ModelJsonShape["queryStrategy"]): string {
  if (!value) {
    return DEFAULT_PLAN.queryStrategy;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  const parts: string[] = [];
  if (value.summary) {
    parts.push(value.summary.trim());
  }
  if (value.booleanString) {
    parts.push("Boolean search string:");
    parts.push(value.booleanString.trim());
  }
  if (value.filters && value.filters.length > 0) {
    parts.push("Filters:");
    parts.push(toBulletList(value.filters));
  }
  if (value.sources && value.sources.length > 0) {
    parts.push("Sources:");
    parts.push(toBulletList(value.sources));
  }
  if (value.steps && value.steps.length > 0) {
    parts.push("Steps:");
    parts.push(toBulletList(value.steps));
  }
  if (value.notes) {
    parts.push("Notes:");
    parts.push(value.notes.trim());
  }
  if (value.raw) {
    parts.push(value.raw.trim());
  }

  if (parts.length === 0) {
    return DEFAULT_PLAN.queryStrategy;
  }

  return parts.join("\n\n");
}

function normalizeOutline(value: ModelJsonShape["outline"] | string | undefined): string {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return DEFAULT_PLAN.outline;
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : DEFAULT_PLAN.outline;
  }

  if (!Array.isArray(value)) {
    return DEFAULT_PLAN.outline;
  }

  const lines: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry === "string") {
      lines.push(`${index + 1}. ${entry.trim()}`);
      return;
    }

    const heading = entry.heading ? entry.heading.trim() : `Section ${index + 1}`;
    lines.push(`${index + 1}. ${heading}`);

    if (entry.summary) {
      lines.push(`   - ${entry.summary.trim()}`);
    }

    if (entry.bullets && entry.bullets.length > 0) {
      entry.bullets
        .filter((bullet): bullet is string => typeof bullet === "string" && bullet.trim().length > 0)
        .forEach((bullet) => lines.push(`   - ${bullet.trim()}`));
    }
  });

  return lines.join("\n");
}

function normalizeTargetSources(value: ModelJsonShape["targetSources"]): string[] {
  if (!value || value.length === 0) {
    return DEFAULT_SOURCES;
  }

  const sources = value
    .map((source) => (typeof source === "string" ? source.trim().toLowerCase() : ""))
    .filter((source) => source.length > 0);

  return sources.length > 0 ? sources : DEFAULT_SOURCES;
}

function buildPrompt(context: PlanContext) {
  const lines: string[] = [
    "You are an expert medical research strategist.",
    "Produce a JSON object that outlines a research plan for an evidence review.",
    "Fields: scope (string), questions (array of strings), queryStrategy (object), outline (array), targetSources (array of strings), rationale (string).",
    "Scope should use PICO when relevant. Questions must be actionable and aligned with scope.",
    "Query strategy should include boolean strings, key filters, and database hints.",
    "Outline should reflect a structured manuscript flow.",
    "Target sources should reference medical literature databases.",
    "Respond ONLY with JSON.",
    "",
    `Project: ${context.project.name}`,
  ];

  if (context.project.description) {
    lines.push(`Project description: ${context.project.description}`);
  }
  if (context.currentPlan) {
    lines.push("Current plan snapshot:");
    lines.push(JSON.stringify(context.currentPlan, null, 2));
  }
  if (context.overrides) {
    lines.push("User-provided updates:");
    lines.push(JSON.stringify(context.overrides, null, 2));
  }

  return lines.join("\n");
}

function fallbackPlan(overrides?: Partial<ResearchPlanContent>): GeneratedPlanSuggestion {
  return {
    ...DEFAULT_PLAN,
    ...overrides,
    targetSources: DEFAULT_SOURCES,
    rationale:
      "Using the default hypertension-focused template. Update your project details or provide hints to refine this plan with AI.",
  };
}

function parseModelOutput(content: string | null | undefined): ModelJsonShape | null {
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as ModelJsonShape;
  } catch (error) {
    console.error("plan-generator: failed to parse model response", error);
    return null;
  }
}

function formatSuggestion(result: ModelJsonShape, overrides?: Partial<ResearchPlanContent>): GeneratedPlanSuggestion {
  return {
    scope: (result.scope ?? overrides?.scope ?? DEFAULT_PLAN.scope).trim(),
    questions: normalizeQuestions(result.questions ?? overrides?.questions),
    queryStrategy: normalizeQueryStrategy(result.queryStrategy ?? overrides?.queryStrategy),
    outline: normalizeOutline(result.outline ?? overrides?.outline),
    targetSources: normalizeTargetSources(result.targetSources),
    rationale: typeof result.rationale === "string" ? result.rationale.trim() : undefined,
  };
}

export async function generateResearchPlanSuggestion(context: PlanContext): Promise<GeneratedPlanSuggestion> {
  await limiter.wait();
  const client = getOpenAIClient();
  const fallback = fallbackPlan(context.overrides);

  if (!client) {
    return fallback;
  }

  try {
    const completion = await client.chat.completions.create({
      model: PLAN_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You produce structured research planning roadmaps for medical literature reviews. Output must be valid JSON.",
        },
        {
          role: "user",
          content: buildPrompt(context),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    const parsed = parseModelOutput(content);
    if (parsed) {
      return formatSuggestion(parsed, context.overrides);
    }
  } catch (error) {
    console.error("plan-generator: failed to generate plan suggestion", error);
  }

  return fallback;
}
