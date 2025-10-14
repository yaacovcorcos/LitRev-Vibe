"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAddLocator, useLedgerEntries, useVerifyLocator, type LedgerEntry } from "@/hooks/use-ledger";
import { useProject } from "@/hooks/use-projects";
import { determineLocatorStatus, getLocatorStatusDisplay, type LocatorStatus } from "@/lib/ledger/status";
import { cn } from "@/lib/utils";
import { LocatorBanner } from "@/components/ledger/locator-banner";

const pageSize = 20;

type Params = {
  id: string;
};

export default function LedgerPage() {
  const params = useParams<Params>();
  const projectId = params?.id ?? null;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const [page] = useState(0);
  const { data: ledgerData, isLoading: ledgerLoading, isError: ledgerError, refetch, isRefetching } = useLedgerEntries(
    projectId,
    page,
    pageSize,
  );
  const addLocatorMutation = useAddLocator(page, pageSize);

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [locatorForm, setLocatorForm] = useState({
    page: "",
    paragraph: "",
    sentence: "",
    note: "",
    quote: "",
    source: "",
  });
  const [locatorError, setLocatorError] = useState<string | null>(null);

  const projectName = useMemo(() => {
    if (projectLoading) {
      return "Loading project...";
    }
    return project?.name ?? "Untitled project";
  }, [projectLoading, project?.name]);

  useEffect(() => {
    if (!selectedEntryId && ledgerData?.entries.length) {
      setSelectedEntryId(ledgerData.entries[0].id);
    }
  }, [ledgerData, selectedEntryId]);

  const selectedEntry = useMemo(() => {
    if (!ledgerData?.entries.length) {
      return null;
    }

    return ledgerData.entries.find((entry) => entry.id === selectedEntryId) ?? ledgerData.entries[0];
  }, [ledgerData, selectedEntryId]);

  const hasLocatorInput = Boolean(
    locatorForm.page.trim() ||
      locatorForm.paragraph.trim() ||
      locatorForm.sentence.trim() ||
      locatorForm.note.trim() ||
      locatorForm.quote.trim(),
  );

  const handleLocatorSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !selectedEntry) {
      return;
    }
    if (!hasLocatorInput) {
      setLocatorError("Add at least one locator detail before saving.");
      return;
    }

    const locatorPayload: {
      page?: number;
      paragraph?: number;
      sentence?: number;
      note?: string;
    } = {};

    const parseIntegerField = (value: string, label: string) => {
      if (!value.trim()) {
        return;
      }

      const parsed = Number(value.trim());
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error(`${label} must be a positive integer.`);
      }

      return parsed;
    };

    try {
      addLocatorMutation.reset();
      setLocatorError(null);

      const pageNumber = parseIntegerField(locatorForm.page, "Page");
      if (pageNumber !== undefined) {
        locatorPayload.page = pageNumber;
      }

      const paragraphNumber = parseIntegerField(locatorForm.paragraph, "Paragraph");
      if (paragraphNumber !== undefined) {
        locatorPayload.paragraph = paragraphNumber;
      }

      const sentenceNumber = parseIntegerField(locatorForm.sentence, "Sentence");
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

      await addLocatorMutation.mutateAsync({
        projectId,
        entryId: selectedEntry.id,
        locator: locatorPayload,
      });

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
        setLocatorError("Unable to add locator. Try again.");
      }
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/projects" className="transition hover:text-foreground/80">
            Projects
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <Link href={`/project/${projectId ?? ""}/planning`} className="transition hover:text-foreground/80">
            {projectName}
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <span className="text-foreground/90">Evidence Ledger</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            {projectLoading ? (
              <Skeleton className="h-7 w-48 rounded" />
            ) : (
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                Evidence Ledger
              </h1>
            )}
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track vetted references ready for composition. Each entry includes provenance, integrity notes, and verified
              locator coverage.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isRefetching ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {ledgerData ? `${ledgerData.total} entr${ledgerData.total === 1 ? "y" : "ies"}` : ""}
          </div>
        </div>
      </header>

      <Separator />

      {ledgerError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load ledger entries.{" "}
          <button
            type="button"
            className="underline decoration-dotted underline-offset-2 transition hover:text-destructive/80"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="border-muted-foreground/20 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground">Ledger entries</CardTitle>
            <p className="text-sm text-muted-foreground">Select an entry to review locators, provenance, and integrity signals.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {ledgerLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded" />
                ))}
              </div>
            ) : ledgerData && ledgerData.entries.length > 0 ? (
              <ul className="space-y-2">
                {ledgerData.entries.map((entry) => {
                  const metadata = entry.metadata;
                  const rawTitle = metadata["title"];
                  const title = typeof rawTitle === "string" ? rawTitle : entry.citationKey;
                  const rawAuthors = metadata["authors"];
                  const authorList = Array.isArray(rawAuthors)
                    ? rawAuthors.filter((author): author is string => typeof author === "string")
                    : [];
                  const authors = authorList.length > 0 ? authorList.join(", ") : undefined;
                  const journal = metadata["journal"];
                  const publisher = metadata["publisher"];
                  const venue = typeof journal === "string" ? journal : typeof publisher === "string" ? publisher : undefined;
                  const locatorStatus = determineLocatorStatus({
                    locators: entry.locators,
                    verifiedByHuman: entry.verifiedByHuman,
                  });

                  const display = getLocatorStatusDisplay(locatorStatus);
                  const statusClasses = getLocatorBadgeClasses(display.tone);

                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedEntryId(entry.id)}
                        className={cn(
                          "w-full rounded-lg border border-transparent p-4 text-left transition hover:bg-muted/60",
                          selectedEntry?.id === entry.id ? "border-primary bg-muted/80" : "bg-card",
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">{title}</p>
                          <Badge variant={display.badgeVariant} className={statusClasses}>
                            {display.label}
                          </Badge>
                        </div>
                        {authors ? <p className="mt-2 text-xs text-muted-foreground line-clamp-1">{authors}</p> : null}
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                          {venue ? String(venue) : "Unspecified venue"} · {new Date(entry.keptAt).toLocaleDateString()}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded border border-dashed border-muted-foreground/40 p-8 text-center text-sm text-muted-foreground">
                No ledger entries yet. Keep candidates with verified locators to populate this view.
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Pagination coming soon — this view shows the {pageSize} most recent entries.
          </CardFooter>
        </Card>

        <Card className="border-muted-foreground/20 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground">Inspector</CardTitle>
            <p className="text-sm text-muted-foreground">Review metadata, provenance, and locator coverage. Editing tools arrive in the next iteration.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {ledgerLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : selectedEntry ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">{extractTitle(selectedEntry)}</p>
                  <p className="text-xs text-muted-foreground">
                    Citation key: <span className="font-mono text-foreground/90">{selectedEntry.citationKey}</span>
                  </p>
                  <InspectorStatusBanner entry={selectedEntry} />
                </div>
                <InspectorSection title="Metadata">
                  <MetadataList metadata={selectedEntry.metadata} />
                </InspectorSection>
                <InspectorSection title="Locators">
                  {selectedEntry.locators.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {selectedEntry.locators.map((locator, index) => (
                        <li key={index} className="rounded border border-muted-foreground/30 bg-muted/40 p-3">
                          <LocatorSummary locator={locator} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No locators captured yet.</p>
                  )}
                  <form
                    className="mt-4 space-y-4 rounded-lg border border-muted-foreground/20 bg-muted/30 p-4"
                    onSubmit={handleLocatorSubmit}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add locator</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <LocatorField
                        id="locator-page"
                        label="Page"
                        placeholder="e.g. 12"
                        value={locatorForm.page}
                        onChange={(value) =>
                          setLocatorForm((prev) => ({
                            ...prev,
                            page: value,
                          }))
                        }
                        disabled={addLocatorMutation.isPending}
                      />
                      <LocatorField
                        id="locator-paragraph"
                        label="Paragraph"
                        placeholder="Optional"
                        value={locatorForm.paragraph}
                        onChange={(value) =>
                          setLocatorForm((prev) => ({
                            ...prev,
                            paragraph: value,
                          }))
                        }
                        disabled={addLocatorMutation.isPending}
                      />
                      <LocatorField
                        id="locator-sentence"
                        label="Sentence"
                        placeholder="Optional"
                        value={locatorForm.sentence}
                        onChange={(value) =>
                          setLocatorForm((prev) => ({
                            ...prev,
                            sentence: value,
                          }))
                        }
                        disabled={addLocatorMutation.isPending}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="locator-note" className="text-xs font-medium text-muted-foreground">
                        Note
                      </Label>
                      <Textarea
                        id="locator-note"
                        rows={2}
                        placeholder="Summarize the snippet or add reviewer guidance."
                        value={locatorForm.note}
                        onChange={(event) =>
                          setLocatorForm((prev) => ({
                            ...prev,
                            note: event.target.value,
                          }))
                        }
                        className="text-sm"
                        disabled={addLocatorMutation.isPending}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="locator-quote" className="text-xs font-medium text-muted-foreground">
                        Quote
                      </Label>
                      <Textarea
                        id="locator-quote"
                        rows={3}
                        placeholder="Paste the exact supporting text from the source."
                        value={locatorForm.quote}
                        onChange={(event) =>
                          setLocatorForm((prev) => ({
                            ...prev,
                            quote: event.target.value,
                          }))
                        }
                        className="text-sm"
                        disabled={addLocatorMutation.isPending}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="locator-source" className="text-xs font-medium text-muted-foreground">
                        Source
                      </Label>
                      <input
                        id="locator-source"
                        type="text"
                        placeholder="e.g. PDF page 5, column 2"
                        value={locatorForm.source}
                        onChange={(event) =>
                          setLocatorForm((prev) => ({
                            ...prev,
                            source: event.target.value,
                          }))
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={addLocatorMutation.isPending}
                      />
                    </div>
                    {locatorError ? <p className="text-xs text-destructive">{locatorError}</p> : null}
                    <div className="flex items-center gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addLocatorMutation.isPending || !hasLocatorInput || !projectId || !selectedEntry}
                      >
                        {addLocatorMutation.isPending ? "Saving..." : "Save locator"}
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
                        disabled={addLocatorMutation.isPending}
                      >
                        Reset
                      </Button>
                    </div>
                  </form>
                </InspectorSection>
                <InspectorSection title="Integrity notes">
                  {(() => {
                    const parsedFlags = parseIntegrityNotes(selectedEntry.integrityNotes);
                    if (parsedFlags.length === 0) {
                      return <p className="text-sm text-muted-foreground">No integrity notes recorded.</p>;
                    }

                    return (
                      <ul className="space-y-2 text-sm">
                        {parsedFlags.map((flag, index) => (
                          <li
                            key={`${flag.source}-${flag.label}-${index}`}
                            className={cn(
                              "rounded border p-3",
                              flag.severity === "critical"
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : flag.severity === "warning"
                                  ? "border-amber-300/70 bg-amber-100/60 text-amber-800"
                                  : "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
                            )}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide">
                              {flag.label}
                              <span className="ml-2 text-[10px] capitalize text-muted-foreground/70">{flag.source}</span>
                            </p>
                            {flag.reason ? <p className="text-xs text-foreground/80">{flag.reason}</p> : null}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </InspectorSection>
                <InspectorSection title="Provenance">
                  <pre className="overflow-x-auto rounded bg-muted/50 p-3 text-xs text-foreground/90">
                    {JSON.stringify(selectedEntry.provenance, null, 2)}
                  </pre>
                </InspectorSection>
              </div>
            ) : (
              <div className="rounded border border-dashed border-muted-foreground/40 p-8 text-center text-sm text-muted-foreground">
                Select an entry from the list to review its details.
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Badge variant="outline" className="uppercase text-[11px] tracking-wide">
              Locator workflow coming soon
            </Badge>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

type InspectorSectionProps = {
  title: string;
  children: ReactNode;
};

function InspectorSection({ title, children }: InspectorSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <Separator />
      {children}
    </div>
  );
}

type InspectorStatusBannerProps = {
  entry: LedgerEntry;
};

function InspectorStatusBanner({ entry }: InspectorStatusBannerProps) {
  const status = determineLocatorStatus({ locators: entry.locators, verifiedByHuman: entry.verifiedByHuman });
  const display = getLocatorStatusDisplay(status);

  return (
    <LocatorBanner
      display={display}
      tone={display.tone}
      actionSlot={
        status === "locator_pending_review" ? (
          <VerifyButton entryId={entry.id} page={0} pageSize={pageSize} />
        ) : null
      }
    />
  );
}

function extractTitle(entry: { metadata: Record<string, unknown>; citationKey: string }) {
  const metadata = entry.metadata;
  const title = metadata["title"];
  if (typeof title === "string" && title.trim()) {
    return title;
  }
  return entry.citationKey;
}

type MetadataListProps = {
  metadata: Record<string, unknown>;
};

function MetadataList({ metadata }: MetadataListProps) {
  const rawAuthors = metadata["authors"];
  const authorList = Array.isArray(rawAuthors)
    ? rawAuthors.filter((author): author is string => typeof author === "string")
    : [];
  const journal = metadata["journal"];
  const publisher = metadata["publisher"];
  const venue = typeof journal === "string" ? journal : typeof publisher === "string" ? publisher : undefined;
  const publishedAtRaw = metadata["publishedAt"];
  const publishedAt = typeof publishedAtRaw === "string" ? publishedAtRaw : undefined;

  return (
    <div className="space-y-2 text-sm">
      {authorList.length > 0 ? (
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Authors:</span> {authorList.join(", ")}
        </p>
      ) : null}
      {venue ? (
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Venue:</span> {String(venue)}
        </p>
      ) : null}
      {publishedAt ? (
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">Published:</span> {publishedAt}
        </p>
      ) : null}
      <div className="space-y-1 rounded border border-muted-foreground/20 bg-muted/30 p-3">
        <p className="text-xs text-muted-foreground">Raw metadata (JSON)</p>
        <pre className="max-h-48 overflow-auto text-xs text-foreground/90">{JSON.stringify(metadata, null, 2)}</pre>
      </div>
    </div>
  );
}

type LocatorSummaryProps = {
  locator: Record<string, unknown>;
};

function LocatorSummary({ locator }: LocatorSummaryProps) {
  const parts = [
    typeof locator["page"] === "number" ? `Page ${locator["page"]}` : null,
    typeof locator["paragraph"] === "number" ? `Paragraph ${locator["paragraph"]}` : null,
    typeof locator["sentence"] === "number" ? `Sentence ${locator["sentence"]}` : null,
  ].filter(Boolean);

  const note = typeof locator["note"] === "string" ? (locator["note"] as string) : null;
  const quote = typeof locator["quote"] === "string" ? (locator["quote"] as string) : null;
  const source = typeof locator["source"] === "string" ? (locator["source"] as string) : null;

  if (parts.length === 0 && !note && !quote) {
    return <pre className="text-xs text-muted-foreground">{JSON.stringify(locator, null, 2)}</pre>;
  }

  return (
    <div className="space-y-1 text-sm text-foreground/90">
      {parts.length > 0 ? <p>{parts.join(" · ")}</p> : null}
      {note ? <p className="text-xs text-muted-foreground/80">{note}</p> : null}
      {quote ? (
        <blockquote className="rounded border-l-2 border-muted-foreground/50 bg-muted/30 px-3 py-2 text-xs italic text-muted-foreground">
          <q>{quote}</q>
        </blockquote>
      ) : null}
      {source ? <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Source: {source}</p> : null}
    </div>
  );
}

type IntegrityFlag = {
  label: string;
  severity: "critical" | "warning" | "info";
  source: string;
  reason?: string;
};

function parseIntegrityNotes(value: unknown): IntegrityFlag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const label = typeof record.label === "string" ? record.label : null;
      const severityRaw = typeof record.severity === "string" ? record.severity : null;
      const source = typeof record.source === "string" ? record.source : "unknown";
      const reason = typeof record.reason === "string" ? record.reason : undefined;

      if (!label || !severityRaw) {
        return null;
      }

      const severity = severityRaw === "critical" || severityRaw === "warning" ? severityRaw : "info";

      return {
        label,
        severity,
        source,
        reason,
      } satisfies IntegrityFlag;
    })
    .filter((flag): flag is IntegrityFlag => flag !== null);
}

type LocatorFieldProps = {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function LocatorField({ id, label, placeholder, value, onChange, disabled }: LocatorFieldProps) {
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
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
      />
    </div>
  );
}

export { LocatorSummary };

type VerifyButtonProps = {
  entryId: string;
  page: number;
  pageSize: number;
};

function VerifyButton({ entryId, page, pageSize }: VerifyButtonProps) {
  const params = useParams<Params>();
  const projectId = params?.id;
  const verifyMutation = useVerifyLocator(page, pageSize);

  const handleVerify = () => {
    if (!projectId) {
      return;
    }
    verifyMutation.mutate({ projectId, entryId, verified: true });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={verifyMutation.isPending}
      onClick={handleVerify}
      className="text-xs"
    >
      {verifyMutation.isPending ? "Marking…" : "Mark as verified"}
    </Button>
  );
}

const BADGE_CLASSES = {
  danger: "border-destructive/40 text-destructive",
  warning: "border-amber-300 text-amber-700",
  success: "border-primary/40 text-primary",
} as const;

function getLocatorBadgeClasses(tone: keyof typeof BADGE_CLASSES) {
  return cn("uppercase text-[11px]", BADGE_CLASSES[tone]);
}
