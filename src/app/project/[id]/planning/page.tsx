"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PlanningSection } from "@/components/planning/section";
import { useProject } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";

const DEFAULT_PLAN = {
  scope:
    "Population: Adults with hypertension\nIntervention: Lifestyle modifications (diet, exercise, sleep)\nComparison: Standard of care\nOutcomes: Blood pressure reduction, cardiovascular risk markers\nTimeframe: Studies published in the last 10 years",
  questions:
    "- What lifestyle interventions have the strongest evidence for reducing systolic blood pressure?\n- How do combined diet + exercise programs compare to single-modality interventions?\n- What adherence strategies improve long-term outcomes?",
  queryStrategy:
    'Example Boolean string:\n("hypertension" OR "high blood pressure") AND ("lifestyle" OR "diet" OR "exercise")\n\nSources:\n- PubMed\n- Crossref\n- Unpaywall (OA PDFs)\n\nScreening notes: include RCTs, cohort studies, systematic reviews. Exclude pediatric populations.',
  outline:
    "1. Introduction\n   - Hypertension burden\n   - Rationale for lifestyle interventions\n2. Methods\n   - Research question (PICO)\n   - Search strategy & sources\n3. Results\n   - Intervention categories (diet, exercise, combined)\n   - Adherence findings\n4. Discussion\n   - Clinical implications\n   - Gaps & future research",
};

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

type PlanState = typeof DEFAULT_PLAN;

export default function PlanningPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const { data: project, isLoading: projectLoading } = useProject(
    projectId ?? null,
  );

  const [plan, setPlan] = useState<PlanState>(DEFAULT_PLAN);

  useEffect(() => {
    // Future: hydrate plan from persisted data when available.
    setPlan(DEFAULT_PLAN);
  }, [projectId]);

  const handleChange =
    (field: keyof PlanState) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setPlan((prev) => ({ ...prev, [field]: value }));
    };

  const projectName = useMemo(() => {
    if (projectLoading) {
      return "Loading project…";
    }
    return project?.name ?? "Untitled project";
  }, [project, projectLoading]);

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
            <Button variant="outline" disabled>
              Save draft (coming soon)
            </Button>
            <Button disabled>Run search (coming soon)</Button>
          </div>
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
