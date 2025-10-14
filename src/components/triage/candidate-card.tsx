"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAskCandidateAI, useCandidateRationale } from "@/hooks/use-candidate-rationale";
import type { Candidate } from "@/hooks/use-candidates";
import type { AskAiResponse } from "@/lib/ai/rationale";
import type { SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useKeepCandidate } from "@/hooks/use-keep-candidate";
import { useSnippetExtraction } from "@/hooks/use-snippet-extraction";

const FALLBACK_QUESTION = "Does this evidence align with our inclusion criteria?";

type OALinksRecord = {
  bestOALink?: unknown;
  oaStatus?: unknown;
};

type IntegrityFlagRecord = {
  label?: unknown;
  severity?: unknown;
  source?: unknown;
  reason?: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSearchResult(value: unknown): value is SearchResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.externalId && !isString(record.externalId)) {
    return false;
  }
  if (record.title && !isString(record.title)) {
    return false;
  }
  if (record.authors && !isStringArray(record.authors)) {
    return false;
  }

  return true;
}

function isOALinksRecord(value: unknown): value is OALinksRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

type ParsedIntegrityFlag = {
  label: string;
  severity: "critical" | "warning" | "info";
  source: string;
  reason?: string;
};

function parseIntegrityFlags(value: unknown): ParsedIntegrityFlag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const flag = item as IntegrityFlagRecord;
      const label = typeof flag.label === "string" ? flag.label : null;
      const severityRaw = typeof flag.severity === "string" ? flag.severity : null;
      const source = typeof flag.source === "string" ? flag.source : "unknown";
      const reason = typeof flag.reason === "string" ? flag.reason : undefined;

      if (!label || !severityRaw) {
        return null;
      }

      const severity = severityRaw === "critical" || severityRaw === "warning" ? severityRaw : "info";

      return {
        label,
        severity,
        source,
        reason,
      } satisfies ParsedIntegrityFlag;
    })
    .filter((flag): flag is ParsedIntegrityFlag => flag !== null);
}

type CandidateCardProps = {
  projectId: string;
  candidate: Candidate;
  className?: string;
};

export function CandidateCard({ projectId, candidate, className }: CandidateCardProps) {
  const result = isSearchResult(candidate.metadata) ? candidate.metadata : null;
  const authors = result?.authors?.join(", ");
  const oaLinksRecord = isOALinksRecord(candidate.oaLinks) ? candidate.oaLinks : undefined;
  const oaLink = oaLinksRecord && isString(oaLinksRecord.bestOALink) ? oaLinksRecord.bestOALink : undefined;
  const oaStatus = oaLinksRecord && isString(oaLinksRecord.oaStatus) ? oaLinksRecord.oaStatus : undefined;
  const integrityFlags = parseIntegrityFlags(candidate.integrityFlags ?? undefined);
  const triageStatus = typeof candidate.triageStatus === "string" ? candidate.triageStatus.toLowerCase() : "";
  const isPending = triageStatus === "pending";

  const { data: rationaleData, isLoading: rationaleLoading, isError: rationaleError } = useCandidateRationale(
    projectId,
    candidate.id,
    candidate.aiRationale,
  );
  const askMutation = useAskCandidateAI(projectId, candidate.id);
  const keepMutation = useKeepCandidate(projectId);
  const snippetMutation = useSnippetExtraction();

  const [question, setQuestion] = useState(FALLBACK_QUESTION);
  const [askResponse, setAskResponse] = useState<AskAiResponse | null>(null);
  const [keepSuccess, setKeepSuccess] = useState(false);
  const [locatorForm, setLocatorForm] = useState({
    page: "",
    paragraph: "",
    sentence: "",
    note: "",
    quote: "",
    source: "",
  });
  const [locatorError, setLocatorError] = useState<string | null>(null);
  const [snippetMessage, setSnippetMessage] = useState<string | null>(null);

  const handleAsk = async () => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      return;
    }

    try {
      setAskResponse(null);
      const response = await askMutation.mutateAsync(cleanQuestion);
      setAskResponse(response);
    } catch (error) {
      console.error(error);
      setAskResponse({
        answer: "Unable to fetch AI response. Please try again later.",
        quotes: [],
      });
    }
  };

  const hasLocatorInput = Boolean(
    locatorForm.page.trim() ||
      locatorForm.paragraph.trim() ||
      locatorForm.sentence.trim() ||
      locatorForm.note.trim() ||
      locatorForm.quote.trim(),
  );

  const parseLocatorNumber = (value: string, label: string) => {
    if (!value.trim()) {
      return undefined;
    }

    const parsed = Number(value.trim());
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`${label} must be a positive integer.`);
    }

    return parsed;
  };

  const handleKeep = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !isPending) {
      return;
    }

    if (!hasLocatorInput) {
      setLocatorError("Add at least one locator detail before keeping this reference.");
      return;
    }

    try {
      setLocatorError(null);
      setKeepSuccess(false);

      const locatorPayload: {
        page?: number;
        paragraph?: number;
        sentence?: number;
        note?: string;
        quote?: string;
        source?: string;
      } = {};

      const pageNumber = parseLocatorNumber(locatorForm.page, "Page");
      if (pageNumber !== undefined) {
        locatorPayload.page = pageNumber;
      }
      const paragraphNumber = parseLocatorNumber(locatorForm.paragraph, "Paragraph");
      if (paragraphNumber !== undefined) {
        locatorPayload.paragraph = paragraphNumber;
      }
      const sentenceNumber = parseLocatorNumber(locatorForm.sentence, "Sentence");
      if (sentenceNumber !== undefined) {
        locatorPayload.sentence = sentenceNumber;
      }
      const note = locatorForm.note.trim();
      if (note) {
        locatorPayload.note = note;
      }

      const quote = locatorForm.quote.trim();
      if (quote) {
        locatorPayload.quote = quote;
      }

      const source = locatorForm.source.trim();
      if (source) {
        locatorPayload.source = source;
      }

      await keepMutation.mutateAsync({
        projectId,
        candidateId: candidate.id,
        locator: locatorPayload,
      });

      setKeepSuccess(true);
      setLocatorForm({
        page: "",
        paragraph: "",
        sentence: "",
        note: "",
        quote: "",
        source: "",
      });
    } catch (error) {
      if (error instanceof Error) {
        setLocatorError(error.message);
      } else {
        setLocatorError("Unable to keep reference. Try again.");
      }
    }
  };

  return (
    <Card className={cn("border-muted-foreground/20 shadow-sm", className)}>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {candidate.triageStatus.toLowerCase()}
          </Badge>
          <Badge variant="outline" className="uppercase text-xs tracking-wide">
            {candidate.searchAdapter}
          </Badge>
          {oaStatus ? (
            <Badge variant={oaLink ? "default" : "outline"} className="text-xs">
              {oaStatus}
            </Badge>
          ) : null}
          {integrityFlags.map((flag, index) => (
            <Badge
              key={`${flag.source}-${flag.label}-${index}`}
              variant={flag.severity === "critical" ? "destructive" : flag.severity === "warning" ? "outline" : "secondary"}
              className="text-xs"
              title={[flag.label, flag.source ? `Source: ${flag.source}` : null, flag.reason].filter(Boolean).join(" • ")}
            >
              {flag.label}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-lg font-semibold text-foreground">
          {result?.title ?? "Untitled reference"}
        </CardTitle>
        {authors ? <p className="text-sm text-muted-foreground">{authors}</p> : null}
        {result?.journal ? (
          <p className="text-xs text-muted-foreground/80">
            {result.journal}
            {result.publishedAt ? ` • ${result.publishedAt}` : ""}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {result?.abstract ? <p className="line-clamp-5 whitespace-pre-wrap text-foreground/90">{result.abstract}</p> : null}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {result?.url ? (
            <a
              className="underline decoration-dashed underline-offset-4 transition hover:text-foreground"
              href={result.url}
              target="_blank"
              rel="noreferrer"
            >
              View source
            </a>
          ) : null}
          {oaLink ? (
            <a
              className="underline decoration-dotted underline-offset-4 transition hover:text-foreground"
              href={oaLink}
              target="_blank"
              rel="noreferrer"
            >
              Open access
            </a>
          ) : null}
        </div>
        <div className="space-y-2 rounded-md border border-muted-foreground/20 bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI rationale</p>
          {rationaleLoading ? (
            <p className="text-xs text-muted-foreground">Generating summary…</p>
          ) : rationaleError ? (
            <p className="text-xs text-destructive">Unable to load rationale.</p>
          ) : rationaleData ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground/90">{rationaleData.summary}</p>
              {rationaleData.bulletPoints ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {rationaleData.bulletPoints.map((point, index) => (
                    <li key={index}>• {point}</li>
                  ))}
                </ul>
              ) : null}
              {rationaleData.confidence ? (
                <p className="text-xs text-muted-foreground/80">Confidence: {rationaleData.confidence}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
      <CardFooter className="flex w-full flex-col gap-3 border-t border-muted-foreground/10 bg-card/60">
        <div className="grid gap-6 md:grid-cols-2 md:gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ask AI</p>
            <Textarea rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} className="text-sm" />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={askMutation.isPending || !question.trim()}
                onClick={handleAsk}
              >
                {askMutation.isPending ? "Asking…" : "Ask"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={snippetMutation.isPending || !projectId}
                onClick={async () => {
                  if (!projectId) {
                    return;
                  }
                  try {
                    setSnippetMessage(null);
                    await snippetMutation.mutateAsync({ projectId, candidateId: candidate.id });
                    setSnippetMessage("Snippet job enqueued. Quotes update automatically once ready.");
                  } catch (error) {
                    console.error(error);
                    setSnippetMessage("Unable to enqueue snippet extraction. Try again later.");
                  }
                }}
              >
                {snippetMutation.isPending ? "Enqueuing…" : "Refresh snippets"}
              </Button>
            </div>
            {integrityFlags.length > 0 ? (
              <p className="text-[11px] uppercase tracking-wide text-destructive">
                Integrity flags present — review before keeping.
              </p>
            ) : null}
            {askResponse ? (
              <div className="space-y-3 rounded-md bg-muted/40 p-3 text-sm text-foreground/90">
                <p>{askResponse.answer}</p>
                {askResponse.quotes.length > 0 ? (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-semibold uppercase tracking-wide">Quotes</p>
                    <ul className="space-y-1">
                      {askResponse.quotes.map((quote, index) => (
                        <li key={index}>
                          <q className="font-medium text-foreground/90">{quote.text}</q>
                          {quote.source ? (
                            <span className="ml-1 text-muted-foreground/80">— {quote.source}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
            {snippetMessage ? <p className="text-xs text-muted-foreground">{snippetMessage}</p> : null}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keep to ledger</p>
            {isPending ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Supply a locator snippet before keeping. This enforces the “no claim without a locator” policy.
                </p>
                <form onSubmit={handleKeep} className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <LocatorInput
                      id={`${candidate.id}-keep-page`}
                      label="Page"
                      value={locatorForm.page}
                      disabled={keepMutation.isPending}
                      onChange={(value) =>
                        setLocatorForm((prev) => ({
                          ...prev,
                          page: value,
                        }))
                      }
                    />
                    <LocatorInput
                      id={`${candidate.id}-keep-paragraph`}
                      label="Paragraph"
                      value={locatorForm.paragraph}
                      disabled={keepMutation.isPending}
                      onChange={(value) =>
                        setLocatorForm((prev) => ({
                          ...prev,
                          paragraph: value,
                        }))
                      }
                    />
                    <LocatorInput
                      id={`${candidate.id}-keep-sentence`}
                      label="Sentence"
                      value={locatorForm.sentence}
                      disabled={keepMutation.isPending}
                      onChange={(value) =>
                        setLocatorForm((prev) => ({
                          ...prev,
                          sentence: value,
                        }))
                      }
                    />
                  </div>
              <div className="space-y-1">
                <Label htmlFor={`${candidate.id}-keep-note`} className="text-xs font-medium text-muted-foreground">
                  Note
                </Label>
                <Textarea
                  id={`${candidate.id}-keep-note`}
                  rows={2}
                  value={locatorForm.note}
                  onChange={(event) =>
                    setLocatorForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  className="text-sm"
                  disabled={keepMutation.isPending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${candidate.id}-keep-quote`} className="text-xs font-medium text-muted-foreground">
                  Quote
                </Label>
                <Textarea
                  id={`${candidate.id}-keep-quote`}
                  rows={3}
                  value={locatorForm.quote}
                  placeholder="Paste the exact supporting text."
                  onChange={(event) =>
                    setLocatorForm((prev) => ({
                      ...prev,
                      quote: event.target.value,
                    }))
                  }
                  className="text-sm"
                  disabled={keepMutation.isPending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${candidate.id}-keep-source`} className="text-xs font-medium text-muted-foreground">
                  Source
                </Label>
                <input
                  id={`${candidate.id}-keep-source`}
                  type="text"
                  value={locatorForm.source}
                  placeholder="e.g. PDF page 5, column 2"
                  onChange={(event) =>
                    setLocatorForm((prev) => ({
                      ...prev,
                      source: event.target.value,
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={keepMutation.isPending}
                />
              </div>
                  {locatorError ? <p className="text-xs text-destructive">{locatorError}</p> : null}
                  {keepMutation.isError ? (
                    <p className="text-xs text-destructive">
                      {(keepMutation.error as Error).message || "Failed to keep reference."}
                    </p>
                  ) : null}
                  {keepSuccess ? <p className="text-xs text-emerald-600">Reference kept! Check the Evidence Ledger.</p> : null}
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" disabled={keepMutation.isPending || !projectId}>
                      {keepMutation.isPending ? "Keeping…" : "Keep"}
                    </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setLocatorForm({
                      page: "",
                      paragraph: "",
                      sentence: "",
                      note: "",
                      quote: "",
                      source: "",
                    })
                  }
                  disabled={keepMutation.isPending}
                >
                  Reset
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="rounded-md border border-muted-foreground/40 bg-muted/40 p-3 text-xs text-muted-foreground">
                Already kept. Review locators, integrity notes, and provenance in the Evidence Ledger.
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
type LocatorInputProps = {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

function LocatorInput({ id, label, value, disabled, onChange }: LocatorInputProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
