"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { History, Loader2 } from "lucide-react";

import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityLog } from "@/hooks/use-activity-log";
import { useProject } from "@/hooks/use-projects";

export default function ActivityPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id ?? null;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const {
    data: activityEntries,
    isLoading: activityLoading,
    isRefetching,
  } = useActivityLog(projectId);

  const projectName = useMemo(() => {
    if (projectLoading) {
      return "Loading project…";
    }
    return project?.name ?? "Untitled project";
  }, [project, projectLoading]);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <nav className="text-sm text-muted-foreground">
          <Link
            href="/projects"
            className="transition hover:text-foreground/80"
          >
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
          <span className="text-foreground/90">Activity</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            {projectLoading ? (
              <Skeleton className="h-7 w-48 rounded" />
            ) : (
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <History className="h-5 w-5 text-muted-foreground" />
                Activity & Undo Log
              </h1>
            )}
            <p className="max-w-2xl text-sm text-muted-foreground">
              Track automated runs, triage decisions, and compose events. Future releases will enable undoing key actions directly from this timeline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled>
              Export log (coming soon)
            </Button>
            <Button disabled>Configure retention (coming soon)</Button>
          </div>
        </div>
      </header>

      <Separator />

      {activityLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ActivityTimeline entries={activityEntries ?? []} />
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isRefetching ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : null}
        <span>
          Timeline refreshes automatically when new activity is logged. Hooks exposed via `useLogActivity` will keep this view updated.
        </span>
      </div>
    </div>
  );
}
