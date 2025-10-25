"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Filter, Loader2, Search } from "lucide-react";

import { CandidateCard } from "@/components/triage/candidate-card";
import { CandidateSkeleton } from "@/components/triage/candidate-skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCandidates, useEnqueueSearch } from "@/hooks/use-candidates";
import { useProject } from "@/hooks/use-projects";
import type { SearchQuery } from "@/lib/search";
import { searchAdapters } from "@/lib/search";

const adapterOptions = searchAdapters.map((adapter) => ({ id: adapter.id, label: adapter.label }));
const STORAGE_KEY_PREFIX = "litrev.adapters";

export default function TriagePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? null;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const page = 0;
  const pageSize = 20;
  const statuses = ["pending"];
  const { data: candidateData, isLoading: candidatesLoading, isRefetching } = useCandidates(projectId, page, pageSize, statuses);
  const enqueueSearch = useEnqueueSearch(page, pageSize, statuses);

  const [queryTerms, setQueryTerms] = useState("hypertension lifestyle modifications");
  const [selectedAdapters, setSelectedAdapters] = useState<string[]>(() => adapterOptions.map((option) => option.id));
  const [adapterError, setAdapterError] = useState<string | null>(null);
  const projectName = useMemo(() => {
    if (projectLoading) {
      return "Loading project…";
    }
    return project?.name ?? "Untitled project";
  }, [project, projectLoading]);

  useEffect(() => {
    if (!projectId || typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}.${projectId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          setSelectedAdapters(parsed);
        }
      } catch {
        setSelectedAdapters(adapterOptions.map((option) => option.id));
      }
    } else {
      setSelectedAdapters(adapterOptions.map((option) => option.id));
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}.${projectId}`,
      JSON.stringify(selectedAdapters.length > 0 ? selectedAdapters : []),
    );
  }, [projectId, selectedAdapters]);

  const toggleAdapter = (adapterId: string) => {
    setSelectedAdapters((current) => {
      const exists = current.includes(adapterId);
      const next = exists ? current.filter((id) => id !== adapterId) : [...current, adapterId];
      return next;
    });
    setAdapterError(null);
  };

  const hasAdaptersSelected = selectedAdapters.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !queryTerms.trim()) {
      return;
    }

    if (!hasAdaptersSelected) {
      setAdapterError("Select at least one adapter before running a search.");
      return;
    }

    const payload: SearchQuery = {
      terms: queryTerms.trim(),
      pageSize: 20,
    };

    enqueueSearch.mutate({ projectId, query: payload, adapters: selectedAdapters });
  };

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
            {projectName}
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <span className="text-foreground/90">Search & Triage</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            {projectLoading ? (
              <Skeleton className="h-7 w-48 rounded" />
            ) : (
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Filter className="h-5 w-5 text-muted-foreground" />
                Search & Triage
              </h1>
            )}
            <p className="max-w-2xl text-sm text-muted-foreground">
              Execute searches across supported adapters. Results appear below for manual triage and integrity review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled>
              Saved queries (coming soon)
            </Button>
            <Button variant="outline" disabled>
              Auto triage policy (coming soon)
            </Button>
          </div>
        </div>
      </header>

      <Separator />

      <section>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Search className="h-4 w-4" />
            Search strategy
          </div>
          <div className="space-y-2">
            <Label htmlFor="search-terms">Query terms</Label>
            <Textarea
              id="search-terms"
              value={queryTerms}
              onChange={(event) => setQueryTerms(event.target.value)}
              className="font-mono text-sm"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{`Use Boolean operators. Example: ("hypertension" OR "high blood pressure") AND lifestyle`}</p>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adapters</span>
            <div className="flex flex-wrap gap-2">
              {adapterOptions.map((option) => {
                const isSelected = selectedAdapters.includes(option.id);
                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant={isSelected ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2 px-3 text-xs uppercase tracking-wide"
                    onClick={() => toggleAdapter(option.id)}
                    aria-pressed={isSelected}
                  >
                    <span>{option.label}</span>
                  </Button>
                );
              })}
            </div>
            {!hasAdaptersSelected ? (
              <p className="text-xs text-destructive">Select at least one adapter to run a search.</p>
            ) : null}
            {adapterError ? <p className="text-xs text-destructive">{adapterError}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={enqueueSearch.isPending || !projectId || !hasAdaptersSelected}>
              {enqueueSearch.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Enqueuing…</span>
              ) : (
                "Run search"
              )}
            </Button>
            {enqueueSearch.isSuccess ? (
              <span className="text-xs text-muted-foreground">
                Job queued! Refreshing results automatically.
              </span>
            ) : null}
            {enqueueSearch.isError ? (
              <span className="text-xs text-destructive">Failed to enqueue search. Try again.</span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Pending candidates</h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {isRefetching ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {candidateData ? `${candidateData.total} result${candidateData.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>

        {candidatesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <CandidateSkeleton key={index} />
            ))}
          </div>
        ) : candidateData && candidateData.candidates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {candidateData.candidates.map((candidate) => (
              projectId ? (
                <CandidateCard key={candidate.id} projectId={projectId} candidate={candidate} />
              ) : null
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 p-10 text-center text-sm text-muted-foreground">
            No pending candidates. Run a search or review kept references in the Evidence Ledger.
          </div>
        )}
      </section>
    </div>
  );
}
