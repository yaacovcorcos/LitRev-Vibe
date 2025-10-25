"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookText, Check, Clock3, Loader2, PenSquare, RotateCcw, Send, Undo2 } from "lucide-react";

import { DraftEditor } from "@/components/draft/draft-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDraftSections, useUpdateDraftSection } from "@/hooks/use-draft-sections";
import { useDraftSuggestions, useRequestDraftSuggestion, useResolveDraftSuggestion } from "@/hooks/use-draft-suggestions";
import { useLedgerEntries } from "@/hooks/use-ledger";
import { useEnqueueComposeJob, useJobStatus } from "@/hooks/use-compose";
import { useDraftVersions, useRollbackDraftVersion } from "@/hooks/use-draft-versions";

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
  const updateSection = useUpdateDraftSection();

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [lastJobStatus, setLastJobStatus] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<Record<string, unknown> | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const jobStatus = useJobStatus(projectId, currentJobId);

  const sections = draftData?.sections ?? [];
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;
  const suggestionsQuery = useDraftSuggestions(projectId, activeSection?.id ?? null);
  const suggestions = suggestionsQuery.data?.suggestions ?? [];
  const versionsQuery = useDraftVersions(projectId, activeSection?.id ?? null);
  const rollbackMutation = useRollbackDraftVersion();

  const firstSectionId = sections.length > 0 ? sections[0].id : null;

  useEffect(() => {
    if (!activeSectionId && firstSectionId) {
      setActiveSectionId(firstSectionId);
    }
  }, [activeSectionId, firstSectionId]);

  const selectedSectionId = activeSection?.id ?? null;
  const selectedSectionVersion = activeSection?.version ?? null;
  useEffect(() => {
    if (!selectedSectionId) {
      setPendingContent(null);
      return;
    }

    setPendingContent(activeSection?.content ?? null);
    setFeedbackMessage(null);
  }, [selectedSectionId, selectedSectionVersion, activeSection?.content]);

  const isApproved = activeSection?.status === "approved";
  const isUpdating = updateSection.isPending;

  const isDirty = useMemo(() => {
    if (!activeSection || !pendingContent) {
      return false;
    }

    return JSON.stringify(pendingContent) !== JSON.stringify(activeSection.content ?? {});
  }, [activeSection, pendingContent]);

  const verifiedLedgerIds = useMemo(() => {
    if (!ledgerData?.entries) {
      return [] as string[];
    }

    return ledgerData.entries
      .filter((entry) => entry.verifiedByHuman && entry.locators.length > 0)
      .map((entry) => entry.id);
  }, [ledgerData]);

  const isComposeDisabled = verifiedLedgerIds.length === 0 || composeMutation.isPending;
  const versionPreviews = useMemo(() => {
    if (!activeSection) {
      return [];
    }

    const versions = versionsQuery.data?.versions ?? [];
    return buildVersionPreviews(versions, activeSection.content ?? null, activeSection.version ?? null);
  }, [versionsQuery.data?.versions, activeSection]);

  const latestRestorableVersion = useMemo(() => {
    return versionPreviews.find((preview) => !preview.isCurrent) ?? null;
  }, [versionPreviews]);

  const isRollbackDisabled = rollbackMutation.isPending || !latestRestorableVersion;

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
    if (!projectId || !activeSection || isApproved) {
      return;
    }

    requestSuggestion.mutate({
      projectId,
      draftSectionId: activeSection.id,
      suggestionType: "improvement",
    });
  };

  const handleResolveSuggestion = (suggestionId: string, action: "accept" | "dismiss") => {
    if (!projectId) {
      return;
    }

    resolveSuggestion.mutate({
      projectId,
      suggestionId,
      action,
    });
  };

  const handleSaveDraft = () => {
    if (!projectId || !activeSection || !pendingContent || updateSection.isPending) {
      return;
    }

    setFeedbackMessage(null);
    updateSection.mutate(
      {
        projectId,
        sectionId: activeSection.id,
        content: pendingContent,
      },
      {
        onSuccess: () => {
          setFeedbackMessage("Draft saved");
          refetch();
          suggestionsQuery.refetch();
          versionsQuery.refetch();
        },
      },
    );
  };

  const handleApproveDraft = () => {
    if (!projectId || !activeSection || updateSection.isPending) {
      return;
    }

    setFeedbackMessage(null);
    updateSection.mutate(
      {
        projectId,
        sectionId: activeSection.id,
        status: "approved",
      },
      {
        onSuccess: () => {
          setFeedbackMessage("Draft marked as approved");
          refetch();
          versionsQuery.refetch();
        },
      },
    );
  };

  const handleReopenDraft = () => {
    if (!projectId || !activeSection || updateSection.isPending) {
      return;
    }

    setFeedbackMessage(null);
    updateSection.mutate(
      {
        projectId,
        sectionId: activeSection.id,
        status: "draft",
      },
      {
        onSuccess: () => {
          setFeedbackMessage("Draft reopened for edits");
          refetch();
          versionsQuery.refetch();
        },
      },
    );
  };

  const handleRollback = (version: number | null) => {
    if (!projectId || !activeSection || !version) {
      return;
    }

    rollbackMutation.mutate(
      {
        projectId,
        sectionId: activeSection.id,
        version,
      },
      {
        onSuccess: () => {
          setFeedbackMessage("Draft restored to previous version");
          refetch();
          versionsQuery.refetch();
        },
      },
    );
  };

  useEffect(() => {
    const status = jobStatus.data?.status;
    if (!status || status === lastJobStatus) {
      return;
    }

    setLastJobStatus(status);
    if (status === "completed") {
      refetch();
    }
  }, [jobStatus.data?.status, lastJobStatus, refetch]);

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
              Generate, edit, and approve literature review drafts powered by verified ledger entries. Use the controls below to save changes, track versions, and mark sections as publication-ready.
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
            <Button asChild variant="outline">
              <Link href={`/project/${projectId ?? ""}/ledger`}>Open ledger</Link>
            </Button>
          </div>
        </div>
      </header>

      {feedbackMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {feedbackMessage}
        </div>
      ) : null}

      <Separator />

      {currentJobId ? (
        <ComposeStatusBanner
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
              <header className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-foreground">
                        {getSectionLabel(activeSection.sectionType)}
                      </h2>
                      <Badge variant="outline">Version {activeSection.version}</Badge>
                      <Badge variant={isApproved ? "default" : "secondary"}>{activeSection.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(activeSection.updatedAt).toLocaleString()}
                    </p>
                    {activeSection.approvedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Approved {new Date(activeSection.approvedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2" aria-label="Draft actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={!isDirty || isUpdating || isApproved}
                    >
                      {isUpdating && !isApproved ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving…</span>
                      ) : (
                        <span className="flex items-center gap-2"><PenSquare className="h-4 w-4" /> Save draft</span>
                      )}
                    </Button>
                    {isApproved ? (
                      <Button type="button" variant="outline" disabled={isUpdating} onClick={handleReopenDraft}>
                        <span className="flex items-center gap-2"><Undo2 className="h-4 w-4" /> Reopen draft</span>
                      </Button>
                    ) : (
                      <Button type="button" disabled={isUpdating || isDirty} onClick={handleApproveDraft}>
                        {isUpdating && !isDirty ? (
                          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Updating…</span>
                        ) : (
                          <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Mark as approved</span>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {isUpdating ? (
                  <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                    Saving changes to this section…
                  </p>
                ) : null}
              </header>

              <DraftEditor
                content={pendingContent ?? activeSection.content}
                editable={!isApproved}
                onUpdate={(doc) => setPendingContent(doc)}
              />

              <section className="space-y-2 rounded-lg border border-muted-foreground/40 p-4" aria-label="Section details">
                <h3 className="text-sm font-semibold text-muted-foreground">Section details</h3>
                <dl className="grid gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-medium text-foreground">Status</dt>
                    <dd className="capitalize">{activeSection.status}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-medium text-foreground">Approved</dt>
                    <dd>{activeSection.approvedAt ? new Date(activeSection.approvedAt).toLocaleString() : "Not yet"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-medium text-foreground">Versions tracked</dt>
                    <dd>{versionsQuery.data?.versions.length ?? 0}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-medium text-foreground">Linked evidence</dt>
                    <dd>{activeSection.ledgerEntries.length}</dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-2">
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
              </section>

              <section className="space-y-3 rounded-lg border border-muted-foreground/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Version history</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRollbackDisabled || !activeSection}
                    data-target-version={latestRestorableVersion?.version ?? ""}
                    onClick={() => handleRollback(latestRestorableVersion?.version ?? null)}
                  >
                    {rollbackMutation.isPending ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Rolling back…</span>
                    ) : (
                      <span className="flex items-center gap-2"><RotateCcw className="h-3 w-3" /> Restore latest prior version</span>
                    )}
                  </Button>
                </div>
                {versionsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : versionPreviews.length > 0 ? (
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {versionPreviews.map((preview) => (
                      <li key={preview.id} className="space-y-2 rounded border border-border bg-background px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Clock3 className="h-3 w-3" />
                            <span className="font-medium">v{preview.version}</span>
                            <Badge variant="outline">{preview.status}</Badge>
                            {preview.isCurrent ? (
                              <Badge variant="secondary">Current</Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{new Date(preview.createdAt).toLocaleString()}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={rollbackMutation.isPending || preview.isCurrent}
                            data-target-version={preview.version}
                              onClick={() => handleRollback(preview.version)}
                            >
                              Restore
                            </Button>
                          </div>
                        </div>
                        {preview.diff || preview.locatorSummary ? (
                          <div className="space-y-1 text-muted-foreground">
                            {preview.diff?.removed ? (
                              <p>
                                <span className="font-medium text-rose-600 dark:text-rose-400">Will remove:</span> {preview.diff.removed}
                              </p>
                            ) : null}
                            {preview.diff?.added ? (
                              <p>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">Restored:</span> {preview.diff.added}
                              </p>
                            ) : null}
                            {preview.locatorSummary ? (
                              <p>
                                <span className="font-medium text-muted-foreground">Primary locator:</span> {preview.locatorSummary}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Version history unavailable.</p>
                )}
              </section>

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
  const payload = parseSuggestionDiff(diff);
  if (!payload) {
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

type ParsedSuggestionDiff = {
  before?: string;
  after?: string;
  type?: string;
};

function parseSuggestionDiff(value: unknown): ParsedSuggestionDiff | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const before = typeof candidate.before === "string" ? candidate.before : undefined;
  const after = typeof candidate.after === "string" ? candidate.after : undefined;
  const type = typeof candidate.type === "string" ? candidate.type : undefined;

  if (!before && !after) {
    return null;
  }

  return { before, after, type } satisfies ParsedSuggestionDiff;
}

type VersionRecord = {
  id: string;
  version: number;
  status: string;
  createdAt: string;
  content: Record<string, unknown> | null;
  locators?: Array<Record<string, unknown>> | null;
};

type VersionDiffSummary = {
  added: string | null;
  removed: string | null;
};

type VersionPreview = VersionRecord & {
  diff: VersionDiffSummary | null;
  locatorSummary: string | null;
  isCurrent: boolean;
};

function buildVersionPreviews(
  versions: VersionRecord[],
  currentContent: Record<string, unknown> | null,
  currentVersion: number | null,
): VersionPreview[] {
  return versions.map((record, index) => {
    const baselineContent = index === 0 ? currentContent : versions[index - 1]?.content ?? null;
    const baselineText = extractPlainText(baselineContent);
    const recordText = extractPlainText(record.content);
    const diff = buildDiffSummary(recordText, baselineText);
    const locatorSummary = describeLocator(primaryLocatorFrom(record.locators));

    return {
      ...record,
      diff,
      locatorSummary,
      isCurrent: currentVersion === record.version,
    } satisfies VersionPreview;
  });
}

function primaryLocatorFrom(value: Array<Record<string, unknown>> | null | undefined) {
  if (!value || value.length === 0) {
    return null;
  }

  const [primary] = value;
  if (!primary || typeof primary !== "object") {
    return null;
  }

  return primary;
}

function describeLocator(locator: Record<string, unknown> | null) {
  if (!locator) {
    return null;
  }

  const pointer = resolvePointer(locator);
  const citationKey = typeof locator.citationKey === "string" ? locator.citationKey : undefined;
  const context = resolveLocatorContext(locator);

  const parts = [pointer, citationKey].filter(Boolean).join(" • ");
  if (!parts && !context) {
    return null;
  }

  return context ? `${parts || "Locator"} — ${truncateText(context, 160)}` : parts;
}

function resolvePointer(locator: Record<string, unknown>) {
  if (typeof locator.page === "number" || typeof locator.page === "string") {
    return `Page ${locator.page}`;
  }

  if (typeof locator.paragraph === "number" || typeof locator.paragraph === "string") {
    return `Paragraph ${locator.paragraph}`;
  }

  if (typeof locator.sentence === "number" || typeof locator.sentence === "string") {
    return `Sentence ${locator.sentence}`;
  }

  return undefined;
}

function resolveLocatorContext(locator: Record<string, unknown>) {
  if (typeof locator.note === "string" && locator.note.trim()) {
    return locator.note;
  }

  if (typeof locator.quote === "string" && locator.quote.trim()) {
    return locator.quote;
  }

  if (typeof locator.context === "string" && locator.context.trim()) {
    return locator.context;
  }

  return undefined;
}

function extractPlainText(content: Record<string, unknown> | null) {
  if (!content) {
    return "";
  }

  let buffer = "";

  const walk = (node: unknown) => {
    if (!node) {
      return;
    }

    if (typeof node === "string") {
      buffer += ` ${node}`;
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === "string") {
        buffer += ` ${obj.text}`;
      }

      if (Array.isArray(obj.content)) {
        obj.content.forEach(walk);
      }
    }
  };

  walk(content);
  return normalizeWhitespace(buffer);
}

function buildDiffSummary(candidateText: string, baselineText: string): VersionDiffSummary | null {
  const candidateSentences = splitSentences(candidateText);
  const baselineSentences = splitSentences(baselineText);

  const baselineSet = new Set(baselineSentences);
  const candidateSet = new Set(candidateSentences);

  const added = candidateSentences.filter((sentence) => !baselineSet.has(sentence)).slice(0, 2);
  const removed = baselineSentences.filter((sentence) => !candidateSet.has(sentence)).slice(0, 2);

  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  return {
    added: added.length > 0 ? truncateText(added.join(" "), 220) : null,
    removed: removed.length > 0 ? truncateText(removed.join(" "), 220) : null,
  } satisfies VersionDiffSummary;
}

function splitSentences(text: string) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return [] as string[];
  }

  const segments = normalized.match(/[^.!?]+[.!?]?/g);
  if (!segments) {
    return [normalized];
  }

  return segments.map((segment) => segment.trim()).filter(Boolean);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength = 160) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}
