"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivitySquare, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobs } from "@/hooks/use-jobs";

export default function RunsPage() {
  const { data, isLoading, isRefetching } = useJobs();

  const jobs = useMemo(() => data?.jobs ?? [], [data]);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/projects" className="transition hover:text-foreground/80">
            Projects
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <span className="text-foreground/90">Runs</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <ActivitySquare className="h-5 w-5 text-muted-foreground" />
              Automation Runs
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Monitor compose, search, and integrity jobs in progress. Progress updates in real time while jobs are running.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/projects">Back to projects</Link>
          </Button>
        </div>
      </header>

      <Separator />

      {isLoading ? (
        <RunsSkeleton />
      ) : jobs.length === 0 ? (
        <EmptyRunsState />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{job.jobType}</Badge>
                    <span className="text-muted-foreground">Project</span>
                    <Link href={`/project/${job.projectId}/draft`} className="text-primary hover:underline">
                      {job.projectId}
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(job.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Status: <strong className="uppercase text-foreground/90">{job.status}</strong></span>
                  <span>Progress: {formatProgress(job.progress)}</span>
                  {isRefetching && job.status === "in_progress" ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded bg-primary transition-all"
                  style={{ width: `${Math.round((job.progress ?? 0) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatProgress(progress: number | null) {
  const value = Math.max(0, Math.min(1, progress ?? 0));
  return `${Math.round(value * 100)}%`;
}

function RunsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyRunsState() {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-10 text-center text-sm text-muted-foreground">
      No automation runs yet. Compose a literature review or trigger a search to see progress here.
    </div>
  );
}
