"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Candidate } from "@/hooks/use-candidates";
import type { SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";

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
  candidate: Candidate;
  className?: string;
};

export function CandidateCard({ candidate, className }: CandidateCardProps) {
  const result = isSearchResult(candidate.metadata) ? candidate.metadata : null;
  const authors = result?.authors?.join(", ");
  const oaLinksRecord = isOALinksRecord(candidate.oaLinks) ? candidate.oaLinks as OALinksRecord : undefined;
  const oaLink = oaLinksRecord && isString(oaLinksRecord.bestOALink) ? oaLinksRecord.bestOALink as string : undefined;
  const oaStatus = oaLinksRecord && isString(oaLinksRecord.oaStatus) ? oaLinksRecord.oaStatus as string : undefined;

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
      </CardContent>
    </Card>
  );
}
