"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAskCandidateAI, useCandidateRationale } from "@/hooks/use-candidate-rationale";
import type { Candidate } from "@/hooks/use-candidates";
import type { AskAiResponse } from "@/lib/ai/rationale";
import type { SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";

const FALLBACK_QUESTION = "Does this evidence align with our inclusion criteria?";

type OALinksRecord = {
  bestOALink?: unknown;
  oaStatus?: unknown;
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

  const { data: rationaleData, isLoading: rationaleLoading, isError: rationaleError } = useCandidateRationale(
    projectId,
    candidate.id,
    candidate.aiRationale,
  );
  const askMutation = useAskCandidateAI(projectId, candidate.id);

  const [question, setQuestion] = useState(FALLBACK_QUESTION);
  const [askResponse, setAskResponse] = useState<AskAiResponse | null>(null);

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
        <div className="space-y-2 w-full">
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
            {askMutation.isError ? <span className="text-xs text-destructive">Request failed.</span> : null}
          </div>
        </div>
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
      </CardFooter>
    </Card>
  );
}
