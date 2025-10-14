"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookText, Loader2, PenSquare, RotateCcw, Send } from "lucide-react";

import { DraftEditor } from "@/components/draft/draft-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraftSections } from "@/hooks/use-draft-sections";
import { useDraftSuggestions, useRequestDraftSuggestion, useResolveDraftSuggestion } from "@/hooks/use-draft-suggestions";
import { useLedgerEntries } from "@/hooks/use-ledger";
import { useEnqueueComposeJob, useJobStatus } from "@/hooks/use-compose";

function getSectionLabel(sectionType: string) {
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

export default function DraftPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? null;

  const { data: draftData, isLoading: draftLoading, refetch } = useDraftSections(projectId);
  const { data: ledgerData } = useLedgerEntries(projectId, 0, 50);
  const requestSuggestion = useRequestDraftSuggestion();
  const resolveSuggestion = useResolveDraftSuggestion();
  const composeMutation = useEnqueueComposeJob();

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [lastJobStatus, setLastJobStatus] = useState<string | null>(null);

  const jobStatus = useJobStatus(projectId, currentJobId);

  const sections = draftData?.sections ?? [];
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;
  const suggestionsQuery = useDraftSuggestions(projectId, activeSection?.id ?? null);
  const suggestions = suggestionsQuery.data?.suggestions ?? [];

  useEffect(() => {
    if (!activeSectionId && sections.length > 0) {
      setActiveSectionId(sections[0].id);
    }
  }, [activeSectionId, sections]);

  const verifiedLedgerIds = useMemo(() => {
    if (!ledgerData?.entries) {
      return [] as string[];
    }

    return ledgerData.entries
      .filter((entry) => entry.verifiedByHuman && entry.locators.length > 0)
      .map((entry) => entry.id);
  }, [ledgerData]);

  const isComposeDisabled = verifiedLedgerIds.length === 0 || composeMutation.isPending;

  const handleCompose = () => {
    if (!projectId) {
      return;
    }

    composeMutation.mutate(
      {
        projectId,
        sections: [
          {
            sectionType: "literature_review",
            ledgerEntryIds: verifiedLedgerIds,
          },
        ],
        narrativeVoice: "neutral",
      },
      {
        onSuccess: (result) => {
          setLastJobStatus(null);
          setCurrentJobId(result.jobId);
        },
      },
    );
  };

  const handleRequestSuggestion = () => {
    if (!projectId || !activeSection) {
      return;
    }

    requestSuggestion.mutate(
      {
        projectId,
        draftSectionId: activeSection.id,
        suggestionType: "improvement",
      },
      {
        onSettled: () => {
          suggestionsQuery.refetch();
        },
      },
    );
  };

  const handleResolveSuggestion = (suggestionId: string, action: "accept" | "dismiss") => {
    if (!projectId) {
      return;
    }

    resolveSuggestion.mutate(
      {
        projectId,
        suggestionId,
        action,
      },
      {
        onSuccess: () => {
          suggestionsQuery.refetch();
          refetch();
        },
      },
    );
  };

  useEffect(() => {
    if (!jobStatus.data) {
      return;
    }

    if (jobStatus.data.status !== lastJobStatus) {
      setLastJobStatus(jobStatus.data.status);
      if (jobStatus.data.status === "completed") {
        setTimeout(() => {
          refetch();
        }, 500);
      }
    }
  }, [jobStatus.data, lastJobStatus, refetch]);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/projects" className="transition hover:text-foreground/80">
            Projects
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <Link
            href={`/project/${projectId ?? ""}/planning`}
            className="transition hover:text-foreground/80"
          >
            Project
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <span className="text-foreground/90">Draft & Compose</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <BookText className="h-5 w-5 text-muted-foreground" />
              Draft & Compose
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Generate and review literature review drafts powered by verified ledger entries. Approvals and detailed editing workflows are coming soon.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleCompose}
              disabled={isComposeDisabled}
            >
              {composeMutation.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Enqueuing…</span>
              ) : (
                <span className="flex items-center gap-2"><PenSquare className="h-4 w-4" /> Compose literature review</span>
              )}
            </Button>
            <Button variant="outline" disabled>
              <RotateCcw className="mr-2 h-4 w-4" /> Rollback version
            </Button>
          </div>
        </div>
      </header>

      <Separator />

      {currentJobId ? (
        <ComposeStatusBanner
          projectId={projectId}
          jobId={currentJobId}
          status={jobStatus.data?.status}
          progress={jobStatus.data?.progress ?? 0}
          isLoading={jobStatus.isLoading}
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Sections</h2>
          {draftLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : sections.length > 0 ? (
            <div className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    activeSection?.id === section.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{getSectionLabel(section.sectionType)}</span>
                    <Badge variant={section.status === "approved" ? "default" : "secondary"}>
                      {section.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Version {section.version}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-muted-foreground/40 p-6 text-sm text-muted-foreground">
              No draft sections yet. Compose a literature review once you have verified ledger entries with locators.
            </div>
          )}
        </aside>

        <article className="space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          {activeSection ? (
            <div className="space-y-4">
              <header className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-foreground">
                    {getSectionLabel(activeSection.sectionType)}
                  </h2>
                  <Badge variant="outline">Version {activeSection.version}</Badge>
                  <Badge variant={activeSection.status === "approved" ? "default" : "secondary"}>
                    {activeSection.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(activeSection.updatedAt).toLocaleString()}
                </p>
              </header>

              <DraftEditor content={activeSection.content} editable={false} />

              <footer className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Linked ledger entries</h3>
                {activeSection.ledgerEntries.length > 0 ? (
                  <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {activeSection.ledgerEntries.map((entry) => (
                      <li key={entry.id} className="rounded border border-border px-2 py-1">
                        {entry.citationKey}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground/80">
                    No ledger citations linked yet.
                  </p>
                )}
              </footer>

              <section className="space-y-3 rounded-lg border border-dashed border-muted-foreground/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">AI suggestions</h3>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRequestSuggestion}
                    disabled={requestSuggestion.isPending || !activeSection}
                  >
                    {requestSuggestion.isPending ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Generating…</span>
                    ) : (
                      "Request suggestion"
                    )}
                  </Button>
                </div>
                {suggestionsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className="space-y-3">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id} className="rounded-md border border-border bg-background p-3 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{suggestion.summary ?? "Suggested improvement"}</p>
                            <p className="text-xs text-muted-foreground">
                              Status: {suggestion.status}
                            </p>
                          </div>
                          {suggestion.status === "pending" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleResolveSuggestion(suggestion.id, "accept")}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveSuggestion(suggestion.id, "dismiss")}
                              >
                                Dismiss
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        {suggestion.diff ? (
                          <SuggestionDiff diff={suggestion.diff} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No suggestions yet. Generate one to see AI recommendations for this section.
                  </p>
                )}
              </section>
            </div>
          ) : draftLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-60 w-full" />
            </div>
          ) : (
            <div className="space-y-4 text-sm text-muted-foreground">
              Select a section to view its draft content.
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

type ComposeStatusBannerProps = {
  projectId: string | null;
  jobId: string | null;
  status?: string;
  progress?: number;
  isLoading: boolean;
};

function ComposeStatusBanner({ jobId, status, progress, isLoading }: ComposeStatusBannerProps) {
  if (!jobId) {
    return null;
  }

  const percent = Math.round((progress ?? 0) * 100);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Send className="h-4 w-4 text-muted-foreground" />
        <span>
          Compose job <span className="font-medium text-foreground">{jobId}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Status: <span className="uppercase text-foreground/90">{status ?? (isLoading ? "loading" : "unknown")}</span></span>
        <span>Progress: {percent}%</span>
      </div>
    </div>
  );
}

type SuggestionDiffProps = {
  diff: Record<string, unknown>;
};

function SuggestionDiff({ diff }: SuggestionDiffProps) {
  const payload = diff as { before?: string; after?: string; type?: string };
  if (!payload || (typeof payload.before !== "string" && typeof payload.after !== "string")) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2 rounded-md bg-muted/30 p-3 text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">Suggested change</span>
        <span>{payload.type ?? "diff"}</span>
      </div>
      {payload.before ? (
        <p><span className="font-medium text-muted-foreground">Before:</span> {payload.before}</p>
      ) : null}
      {payload.after ? (
        <p><span className="font-medium text-muted-foreground">After:</span> {payload.after}</p>
      ) : null}
    </div>
  );
}
