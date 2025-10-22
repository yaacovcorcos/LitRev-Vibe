import { expect, test } from "@playwright/test";

const projectsFixture = [
  {
    id: "demo-project",
    name: "Hypertension Lifestyle Review",
    description: "Primary workspace for cardiovascular intervention research.",
    settings: {
      locatorPolicy: "strict",
      citationStyle: "apa",
      exports: {
        enabledFormats: ["docx", "markdown", "bibtex"],
        defaultFormat: "docx",
        includePrismaDiagram: true,
        includeLedgerExport: true,
      },
    },
    createdAt: new Date("2025-10-01T12:00:00Z"),
    updatedAt: new Date("2025-10-16T08:30:00Z"),
  },
];

const planningFixture = {
  id: "plan-demo",
  scope: "Population: Adults with hypertension\nIntervention: Lifestyle programs combining diet and exercise\nComparison: Standard of care\nOutcomes: Systolic blood pressure reduction, adherence scores\nTimeframe: Publications since 2015",
  questions:
    "- Which combined diet + exercise interventions have the strongest evidence for lowering blood pressure?\n- What adherence strategies sustain outcomes beyond 12 months?\n- How do lifestyle interventions compare against pharmacotherapy in resistant hypertension cohorts?",
  queryStrategy:
    'Boolean string:\n("hypertension" OR "high blood pressure") AND ("lifestyle" OR "diet" OR "exercise") AND (trial OR randomized)\nFilters:\n- Humans\n- Age ≥ 18\n- English language\nKey sources:\n- PubMed (clinical queries)\n- Crossref (recent trials)\n- ClinicalTrials.gov (ongoing studies)',
  outline:
    "1. Introduction\n   - Burden of hypertension\n   - Rationale for lifestyle-focused management\n2. Methods\n   - Research questions & scope\n   - Search strategy & selection criteria\n3. Results\n   - Diet interventions\n   - Exercise programs\n   - Combined lifestyle programs\n4. Discussion\n   - Adherence strategies\n   - Comparative effectiveness vs pharmacotherapy\n   - Research gaps",
  targetSources: ["pubmed", "crossref"],
  status: "draft",
  createdAt: "2025-10-22T10:00:00.000Z",
  updatedAt: "2025-10-22T10:00:00.000Z",
};

async function stubProjectEndpoints(page: Parameters<typeof test>[0]["page"]) {
  await page.route("**/api/trpc/project.list*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          data: {
            json: projectsFixture,
          },
        },
      }),
    });
  });

  await page.route("**/api/trpc/project.byId*", async (route) => {
    const request = route.request();
    let projectId: string | undefined;

    if (request.method() === "GET") {
      const url = new URL(request.url());
      const inputParam = url.searchParams.get("input");
      if (inputParam) {
        const input = JSON.parse(inputParam) as Record<string, unknown>;
        projectId = typeof input["0"] === "string" ? input["0"] : undefined;
      }
    } else {
      const body = await request.postDataJSON();
      if (body) {
        const parsed = body as Record<string, unknown>;
        projectId = typeof parsed["0"] === "string" ? parsed["0"] : undefined;
      }
    }

    const project = projectsFixture.find((entry) => entry.id === projectId);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          data: {
            json: project ?? null,
          },
        },
      }),
    });
  });

  await page.route("**/api/projects/demo-project/planning", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(planningFixture),
    });
  });
}

const isMac = process.platform === "darwin";

test.describe('Design QA snapshots', () => {
  test.skip(!isMac, "Visual baselines currently tracked for macOS only");
test("home page matches baseline @visual", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /workspace scaffolding/i })).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("home-main.png", { fullPage: false });
  });

test("projects page matches baseline @visual", async ({ page }) => {
    await stubProjectEndpoints(page);
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /projects/i })).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("projects-main.png", { fullPage: false });
  });

test("planning page matches baseline @visual", async ({ page }) => {
    await stubProjectEndpoints(page);
    await page.goto("/project/demo-project/planning");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /planning workspace/i })).toBeVisible();
    await expect(page.locator("main")).toHaveScreenshot("planning-main.png", { fullPage: false });
  });
});
