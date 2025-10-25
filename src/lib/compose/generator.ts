import { Prisma } from "@/generated/prisma";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { RateLimiter } from "@/lib/search/rate-limiter";

import type { ComposeJobQueuePayload } from "./jobs";

const COMPOSE_MODEL = process.env.OPENAI_COMPOSE_MODEL ?? "gpt-4o-mini";
const limiter = new RateLimiter(200);

type LedgerEntryInput = {
  id: string;
  citationKey: string;
  metadata: Prisma.JsonValue;
  locators: Prisma.JsonValue;
  verifiedByHuman: boolean;
};

type GenerateComposeDocumentInput = {
  projectId: string;
  section: ComposeJobQueuePayload["sections"][number];
  researchQuestion?: string;
  narrativeVoice?: ComposeJobQueuePayload["narrativeVoice"];
  ledgerEntries: LedgerEntryInput[];
};

type ComposeModelResponse = {
  heading?: string;
  paragraphs: string[];
};

type ProseMirrorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  text?: string;
};

export type ProseMirrorDoc = {
  type: "doc";
  content: ProseMirrorNode[];
};

export async function generateComposeDocument(input: GenerateComposeDocumentInput): Promise<ProseMirrorDoc> {
  const fallback = buildFallbackDocument(input);

  const client = getOpenAIClient();
  if (!client) {
    return fallback;
  }

  await limiter.wait();

  const prompt = buildPrompt(input);

  try {
    const completion = await client.chat.completions.create({
      model: COMPOSE_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are a medical literature review assistant. Write concise academic prose using the provided sources. Respond strictly in JSON matching the schema {\"heading\": string, \"paragraphs\": string[]}. Each paragraph must cite at least one source using the exact bracket notation [citationKey].",
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

    const parsed = safeJsonParse<ComposeModelResponse>(content);
    if (!isComposeModelResponse(parsed) || parsed.paragraphs.length === 0) {
      return fallback;
    }

    const heading = parsed.heading && parsed.heading.trim().length > 0
      ? parsed.heading.trim()
      : resolveHeading(input.section);

    return buildDocument(heading, normalizeParagraphs(parsed.paragraphs), input.section.outline);
  } catch (error) {
    console.error("Failed to generate compose content via OpenAI", error);
    return fallback;
  }
}

function buildPrompt(input: GenerateComposeDocumentInput) {
  const section = input.section;
  const heading = resolveHeading(section);
  const voiceDescriptor = describeNarrativeVoice(input.narrativeVoice ?? "neutral");
  const instructions = section.instructions?.trim();
  const outline = Array.isArray(section.outline) ? section.outline.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
  const targetWordCount = typeof section.targetWordCount === "number" ? section.targetWordCount : undefined;

  const parts: string[] = [
    `Project ID: ${input.projectId}`,
    `Section type: ${section.sectionType}`,
    `Section heading: ${heading}`,
    `Narrative voice: ${voiceDescriptor}`,
  ];

  if (input.researchQuestion?.trim()) {
    parts.push(`Research question: ${input.researchQuestion.trim()}`);
  }

  if (instructions) {
    parts.push(`Instructions: ${instructions}`);
  }

  if (outline.length > 0) {
    parts.push("Outline items:");
    outline.forEach((item, index) => {
      parts.push(`${index + 1}. ${item.trim()}`);
    });
  }

  if (targetWordCount) {
    parts.push(`Approximate target word count: ${targetWordCount}`);
  }

  parts.push(
    "Always cite sources using [citationKey]. Blend sources when appropriate and maintain the requested narrative tone.",
  );

  parts.push("Sources:");

  input.ledgerEntries.forEach((entry, index) => {
    parts.push(formatLedgerEntry(entry, index));
  });

  return parts.join("\n");
}

function buildFallbackDocument(input: GenerateComposeDocumentInput): ProseMirrorDoc {
  const section = input.section;
  const heading = resolveHeading(section);
  const voicePrefix = narrativeVoicePrefix(input.narrativeVoice ?? "neutral");
  const researchSuffix = input.researchQuestion?.trim()
    ? ` This evidence relates to the research question: ${input.researchQuestion.trim()}.`
    : "";

  const paragraphs: string[] = [];

  if (section.instructions?.trim()) {
    paragraphs.push(`Instruction: ${section.instructions.trim()}`);
  }

  for (const [index, entry] of input.ledgerEntries.entries()) {
    const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
    const title = extractString(metadata.title) ?? `Source ${index + 1}`;
    const journal = extractString(metadata.journal);
    const year = extractString(metadata.publishedAt);
    const citationHint = journal || year ? ` (${[journal, year].filter(Boolean).join(", ")})` : "";

    const sentencePrefix = voicePrefix ? `${voicePrefix} ${title}${citationHint}` : `${title}${citationHint}`;

    paragraphs.push(`${sentencePrefix} contributes relevant findings to this section.${researchSuffix} [${entry.citationKey}]`);
  }

  if (paragraphs.length === 0) {
    paragraphs.push("No vetted sources were provided for this section. Add verified ledger entries before composing prose.");
  }

  return buildDocument(heading, paragraphs, section.outline);
}

function resolveHeading(section: ComposeJobQueuePayload["sections"][number]) {
  return section.title?.trim() && section.title.trim().length > 0 ? section.title.trim() : defaultHeading(section.sectionType);
}

function buildDocument(heading: string, paragraphs: string[], outline?: string[]): ProseMirrorDoc {
  const content: ProseMirrorNode[] = [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: heading }],
    },
    ...paragraphs.map((text) => createParagraphNode(text)),
  ];

  const outlineItems = Array.isArray(outline) ? outline.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
  if (outlineItems.length > 0) {
    content.push({
      type: "bulletList",
      content: outlineItems.map((item) => ({
        type: "listItem",
        content: [createParagraphNode(item.trim())],
      })),
    });
  }

  return { type: "doc", content };
}

function createParagraphNode(text: string): ProseMirrorNode {
  return {
    type: "paragraph",
    content: [{ type: "text", text: text.trim() }],
  };
}

function describeNarrativeVoice(narrative: ComposeJobQueuePayload["narrativeVoice"]): string {
  switch (narrative) {
    case "confident":
      return "Confident, assertive tone";
    case "cautious":
      return "Cautious, nuanced tone";
    default:
      return "Neutral, objective tone";
  }
}

function narrativeVoicePrefix(narrative: ComposeJobQueuePayload["narrativeVoice"]): string {
  switch (narrative) {
    case "confident":
      return "The evidence strongly suggests that";
    case "cautious":
      return "The available evidence indicates that";
    default:
      return "";
  }
}

function defaultHeading(sectionType: ComposeJobQueuePayload["sections"][number]["sectionType"]) {
  switch (sectionType) {
    case "literature_review":
      return "Literature Review";
    case "introduction":
      return "Introduction";
    case "methods":
      return "Methods";
    case "results":
      return "Results";
    case "discussion":
      return "Discussion";
    case "conclusion":
      return "Conclusion";
    default:
      return "Draft Section";
  }
}

function formatLedgerEntry(entry: LedgerEntryInput, index: number) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const baseTitle = extractString(metadata.title) ?? `Source ${index + 1}`;
  const authorsArray = Array.isArray(metadata.authors)
    ? metadata.authors.filter((author): author is string => typeof author === "string")
    : [];
  const authors = authorsArray.length > 0 ? authorsArray.join(", ") : undefined;
  const journal = extractString(metadata.journal);
  const year = extractString(metadata.publishedAt);
  const abstract = extractString(metadata.abstract);
  const locatorSummary = summarizeLocator(entry.locators);

  const summaryParts: string[] = [
    `${index + 1}. [${entry.citationKey}] ${baseTitle}`,
  ];

  if (authors) {
    summaryParts.push(`Authors: ${authors}`);
  }
  if (journal || year) {
    summaryParts.push(`Publication: ${[journal, year].filter(Boolean).join(", ")}`);
  }
  if (locatorSummary) {
    summaryParts.push(`Locator: ${locatorSummary}`);
  }
  if (abstract) {
    summaryParts.push(`Abstract: ${truncateText(abstract, 480)}`);
  }

  return summaryParts.join("\n");
}

function summarizeLocator(locators: Prisma.JsonValue): string | null {
  const locatorArray = Array.isArray(locators) ? locators : [];
  if (locatorArray.length === 0) {
    return null;
  }

  const primary = locatorArray[0] as Record<string, unknown>;
  const pointerParts: string[] = [];

  if (typeof primary.page === "number") {
    pointerParts.push(`Page ${primary.page}`);
  }
  if (typeof primary.paragraph === "number") {
    pointerParts.push(`Paragraph ${primary.paragraph}`);
  }
  if (typeof primary.sentence === "number") {
    pointerParts.push(`Sentence ${primary.sentence}`);
  }

  const note = extractString(primary.note);
  const quote = extractString(primary.quote);

  const details = [pointerParts.join(", ") || null, note, quote ? `"${truncateText(quote, 240)}"` : null]
    .filter(Boolean)
    .join(" — ");

  return details || null;
}

function extractString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function safeJsonParse<T>(payload: string): T | null {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    return null;
  }
}

function isComposeModelResponse(value: unknown): value is ComposeModelResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.paragraphs) || record.paragraphs.some((paragraph) => typeof paragraph !== "string")) {
    return false;
  }

  if (record.heading !== undefined && typeof record.heading !== "string") {
    return false;
  }

  return true;
}

function normalizeParagraphs(values: string[]) {
  return values.map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0);
}
