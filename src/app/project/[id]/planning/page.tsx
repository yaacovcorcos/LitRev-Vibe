"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PlanningSection } from "@/components/planning/section";
import { useProject } from "@/hooks/use-projects";
import {
  useResearchPlan,
  useSaveResearchPlan,
} from "@/hooks/use-research-plan";
import {
  DEFAULT_PLAN,
  extractPlanContent,
  plansEqual,
  type ResearchPlanContent,
} from "@/lib/planning/plan";
import { cn } from "@/lib/utils";

const FORM_SECTIONS = [
  {
    key: "scope",
    title: "Scope & PICO",
    description:
      "Define the population, intervention, comparison, and outcomes. This guides downstream search and triage.",
  },
  {
    key: "questions",
    title: "Key Questions",
    description:
      "List the core questions this literature review must answer. These shape Ask-AI prompts and synthesis.",
  },
  {
    key: "queryStrategy",
    title: "Query Strategy",
    description:
      "Capture Boolean strings, MeSH terms, filters, and database preferences. Include inclusion/exclusion notes.",
  },
  {
    key: "outline",
    title: "Draft Outline",
    description:
      "Outline the manuscript or review sections to align automation with your narrative structure.",
  },
] as const;

export default function PlanningPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const { data: project, isLoading: projectLoading } = useProject(
    projectId ?? null,
  );

  const {
    data: planData,
    isLoading: planLoading,
    isFetching: planFetching,
  } = useResearchPlan(projectId ?? null);
  const savePlanMutation = useSaveResearchPlan(projectId ?? null);

  const [plan, setPlan] = useState<ResearchPlanContent>(DEFAULT_PLAN);

  useEffect(() => {
    if (!planData) {
      return;
    }

    const remotePlan = extractPlanContent(planData);
    setPlan((current) => (plansEqual(current, remotePlan) ? current : remotePlan));
  }, [planData]);

  const handleChange =
    (field: keyof ResearchPlanContent) =>
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setPlan((prev) => ({ ...prev, [field]: value }));
    };

  const projectName = useMemo(() => {
    if (projectLoading) {
      return "Loading project…";
    }
    return project?.name ?? "Untitled project";
  }, [project, projectLoading]);

  const comparisonPlan = useMemo(
    () => (planData ? extractPlanContent(planData) : DEFAULT_PLAN),
    [planData],
  );
  const hasUnsavedChanges = useMemo(
    () => !plansEqual(plan, comparisonPlan),
    [plan, comparisonPlan],
  );
  const isSaving = savePlanMutation.isPending;
  const saveError = savePlanMutation.error;
  const saveDisabled =
    !projectId || isSaving || planLoading || !hasUnsavedChanges;
  const lastSavedLabel = useMemo(() => {
    if (!planData?.updatedAt) {
      return null;
    }
    return formatDistanceToNow(new Date(planData.updatedAt), {
      addSuffix: true,
    });
  }, [planData?.updatedAt]);

  const handleSave = () => {
    if (!projectId) {
      return;
    }
    savePlanMutation.mutate(plan);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <nav
          className="text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link
            href="/projects"
            className="transition hover:text-foreground/80"
          >
            Projects
          </Link>{" "}
          <span className="mx-2 text-muted-foreground/70">/</span>
          <span className="text-foreground/90">{projectName}</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            {projectLoading ? (
              <Skeleton className="h-7 w-48 rounded" />
            ) : (
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Planning Workspace
              </h1>
            )}
            <p className="max-w-2xl text-sm text-muted-foreground">
              Formalize the scope, key questions, query strategy, and outline.
              This plan powers automated search, triage, and drafting modules.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={saveDisabled}
              onClick={handleSave}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : hasUnsavedChanges ? (
                "Save draft"
              ) : (
                "Saved"
              )}
            </Button>
            <Button disabled>Run search (coming soon)</Button>
          </div>
          {savePlanMutation.isError ? (
            <p
              className="text-xs text-destructive"
              role="alert"
              aria-live="assertive"
            >
              {saveError?.message ?? "We couldn't save your plan. Please try again."}
            </p>
          ) : null}
          {planFetching || isSaving || lastSavedLabel ? (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {isSaving
                ? "Saving changes…"
                : planFetching
                  ? "Syncing latest plan…"
                  : lastSavedLabel
                    ? `Last saved ${lastSavedLabel}`
                    : null}
            </p>
          ) : null}
        </div>
      </header>

      <Separator />

      <section className="grid gap-6 md:grid-cols-2">
        {FORM_SECTIONS.map((section) => (
          <PlanningSection
            key={section.key}
            title={section.title}
            description={section.description}
          >
            <Label
              htmlFor={`planning-${section.key}`}
              className="text-sm font-medium text-muted-foreground"
            >
              Notes
            </Label>
            <Textarea
              id={`planning-${section.key}`}
              value={plan[section.key]}
              onChange={handleChange(section.key)}
              disabled={planLoading}
              className={cn(
                "min-h-[200px] whitespace-pre-wrap bg-background",
                "font-mono text-sm"
              )}
            />
          </PlanningSection>
        ))}
      </section>
    </div>
  );
}
