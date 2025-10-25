"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pin,
  Sparkles,
} from "lucide-react";

import { useCreateProject } from "@/hooks/use-projects";
import { useHomeProjects, type HomeProjectSummary } from "@/hooks/use-home-projects";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const QUICK_PROMPTS = [
  "Summarize what changed in my open projects this week",
  "Which projects are waiting on curator review?",
  "List drafts that still need locator verification",
];

function formatRelativeDate(dateIso: string) {
  try {
    return formatDistanceToNow(new Date(dateIso), { addSuffix: true });
  } catch (error) {
    console.error("Failed to format date", error);
    return "recently";
  }
}

export default function HomePage() {
  const { data, isLoading, isError, refetch } = useHomeProjects();
  const createProject = useCreateProject();
  const [askValue, setAskValue] = useState("");
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const projects = useMemo(() => {
    if (!data?.projects) {
      return [];
    }

    return [...data.projects].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [data]);

  const handleAsk = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setHistory((prev) => [trimmed, ...prev].slice(0, 4));
    setAskValue("");
  };

  const handleQuickPrompt = (prompt: string) => {
    setAskValue(prompt);
    handleAsk(prompt);
  };

  const handleCreateProject = () => {
    const name = notes.trim() || "Untitled project";
    createProject.mutate(
      { name },
      {
        onSuccess: () => {
          setNotes("");
          refetch();
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Global workspace</h1>
          <p className="text-sm text-muted-foreground">
            Track active literature reviews, start a new project, or surface insights across teams.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/projects">My Projects</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/projects#new">New Project</Link>
          </Button>
        </div>
      </section>

      <Separator />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,4fr)] xl:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Pinned & active projects</h2>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              Refresh
            </Button>
          </div>

          {isError ? (
            <Card className="border-destructive/40 bg-destructive/10 text-destructive">
              <CardContent className="p-4 text-sm">
                Unable to load projects. <button className="underline" onClick={() => refetch()}>Retry</button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <ProjectSkeletonGrid />
          ) : projects.length === 0 ? (
            <EmptyProjectState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-6">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            AI Concierge
          </div>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleAsk(askValue);
            }}
          >
            <div className="flex items-center gap-2">
              <Input
                value={askValue}
                onChange={(event) => setAskValue(event.target.value)}
                placeholder="Ask about your work across projects…"
                aria-label="Ask concierge"
              />
              <Button type="submit">Ask</Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Link href="/projects" className="flex items-center gap-1 text-primary">
                <span>Open full chat</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
              <span>⌘K for global search</span>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quick prompts
            </p>
            <div data-testid="quick-prompts" className="space-y-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  className="w-full rounded-lg border border-dashed border-muted-foreground/40 bg-background px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent prompts
            </p>
            {history.length === 0 ? (
              <p
                data-testid="recent-prompts-empty"
                className="text-sm text-muted-foreground"
              >
                No questions yet. Ask anything about projects, drafts, or exports.
              </p>
            ) : (
              <ul data-testid="recent-prompts-list" className="space-y-2 text-sm text-muted-foreground">
                {history.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex items-start gap-2">
                    <ArrowRight className="mt-1 h-3 w-3 text-muted-foreground/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Quick create note
            </p>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Draft a title for your next review…"
              rows={3}
            />
            <Button onClick={handleCreateProject} disabled={createProject.isPending} className="w-full">
              {createProject.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </span>
              ) : (
                "Create project"
              )}
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

type ProjectCardProps = {
  project: HomeProjectSummary;
};

function ProjectCard({ project }: ProjectCardProps) {
  const hasActiveRun = project.runs.active > 0;
  const draftPercent = project.draft.percent ?? 0;

  return (
    <div
      data-testid="project-card"
      data-pinned={project.pinned ? "true" : "false"}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <Link
            href={`/project/${project.id}`}
            className="text-base font-semibold text-foreground transition hover:text-primary"
          >
            {project.name}
          </Link>
          {project.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          {project.pinned ? <Pin className="h-4 w-4" aria-label="Pinned" /> : null}
          {hasActiveRun ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-label="Run in progress" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-label="Idle" />
          )}
        </div>
      </div>

      <div className="mt-5 space-y-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide">
          <span>
            Ledger {project.ledgerCount} · Draft {draftPercent}% · Updated {formatRelativeDate(project.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <QuickLink href={`/project/${project.id}/planning`}>Open project</QuickLink>
          <QuickLink href={`/project/${project.id}/draft`}>Open draft</QuickLink>
          <QuickLink href={`/project/${project.id}/ledger`}>Open ledger</QuickLink>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button variant="ghost" size="sm" className="px-2 text-xs" asChild>
      <Link className="inline-flex items-center gap-1" href={href}>
        {children}
        <ExternalLink className="h-3 w-3" />
      </Link>
    </Button>
  );
}

function ProjectSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProjectState() {
  return (
    <Card className="border-dashed border-muted-foreground/40 bg-background/80">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          No projects yet. Create your first project to start planning, triage evidence, and draft medical narratives.
        </p>
        <Button asChild>
          <Link href="/projects#new">New Project</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
