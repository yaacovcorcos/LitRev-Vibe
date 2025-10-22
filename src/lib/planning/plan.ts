export type ResearchPlanContent = {
  scope: string;
  questions: string;
  queryStrategy: string;
  outline: string;
};

export type ResearchPlanPayload = ResearchPlanContent & {
  id: string | null;
  status: string;
  targetSources: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

export const DEFAULT_PLAN: ResearchPlanContent = {
  scope:
    "Population: Adults with hypertension\nIntervention: Lifestyle modifications (diet, exercise, sleep)\nComparison: Standard of care\nOutcomes: Blood pressure reduction, cardiovascular risk markers\nTimeframe: Studies published in the last 10 years",
  questions:
    "- What lifestyle interventions have the strongest evidence for reducing systolic blood pressure?\n- How do combined diet + exercise programs compare to single-modality interventions?\n- What adherence strategies improve long-term outcomes?",
  queryStrategy:
    'Example Boolean string:\n("hypertension" OR "high blood pressure") AND ("lifestyle" OR "diet" OR "exercise")\n\nSources:\n- PubMed\n- Crossref\n- Unpaywall (OA PDFs)\n\nScreening notes: include RCTs, cohort studies, systematic reviews. Exclude pediatric populations.',
  outline:
    "1. Introduction\n   - Hypertension burden\n   - Rationale for lifestyle interventions\n2. Methods\n   - Research question (PICO)\n   - Search strategy & sources\n3. Results\n   - Intervention categories (diet, exercise, combined)\n   - Adherence findings\n4. Discussion\n   - Clinical implications\n   - Gaps & future research",
};

export const EMPTY_PLAN_RESPONSE: ResearchPlanPayload = {
  ...DEFAULT_PLAN,
  id: null,
  status: "draft",
  targetSources: [],
  createdAt: null,
  updatedAt: null,
};

function toPlanString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type ResearchPlanRecord = {
  id: string;
  projectId: string;
  scope: unknown;
  questions: unknown;
  queryStrategy: unknown;
  outline: unknown;
  targetSources: string[] | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeResearchPlan(
  record: ResearchPlanRecord,
): ResearchPlanPayload {
  return {
    id: record.id,
    scope: toPlanString(record.scope),
    questions: toPlanString(record.questions),
    queryStrategy: toPlanString(record.queryStrategy),
    outline: toPlanString(record.outline),
    targetSources: record.targetSources ?? [],
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function extractPlanContent(
  payload: ResearchPlanPayload,
): ResearchPlanContent {
  const { scope, questions, queryStrategy, outline } = payload;
  return { scope, questions, queryStrategy, outline };
}

export function plansEqual(
  a: ResearchPlanContent,
  b: ResearchPlanContent,
): boolean {
  return (
    a.scope === b.scope &&
    a.questions === b.questions &&
    a.queryStrategy === b.queryStrategy &&
    a.outline === b.outline
  );
}
