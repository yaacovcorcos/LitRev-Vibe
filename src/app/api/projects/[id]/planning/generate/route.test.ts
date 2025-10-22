import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PLAN } from "@/lib/planning/plan";
import { POST } from "./route";

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
  researchPlan: {
    findUnique: vi.fn(),
  },
}));

const planGeneratorMock = vi.hoisted(() => ({
  generateResearchPlanSuggestion: vi.fn(),
}));

const activityMock = vi.hoisted(() => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/ai/plan-generator", () => ({
  generateResearchPlanSuggestion: planGeneratorMock.generateResearchPlanSuggestion,
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: activityMock.logActivity,
}));

const params = { params: { id: "project-1" } };

describe("POST /api/projects/:id/planning/generate", () => {
  beforeEach(() => {
    prismaMock.project.findUnique.mockReset();
    prismaMock.researchPlan.findUnique.mockReset();
    planGeneratorMock.generateResearchPlanSuggestion.mockReset();
    activityMock.logActivity.mockReset();
  });

  it("returns 404 when project is missing", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    const response = await POST(
      new Request("http://test.local", { method: "POST" }),
      params,
    );

    expect(response.status).toBe(404);
    expect(planGeneratorMock.generateResearchPlanSuggestion).not.toHaveBeenCalled();
    expect(activityMock.logActivity).not.toHaveBeenCalled();
  });

  it("returns 400 when payload invalid", async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });

    const response = await POST(
      new Request("http://test.local", {
        method: "POST",
        body: JSON.stringify({ plan: "invalid" }),
      }),
      params,
    );

    expect(response.status).toBe(400);
    expect(planGeneratorMock.generateResearchPlanSuggestion).not.toHaveBeenCalled();
    expect(activityMock.logActivity).not.toHaveBeenCalled();
  });

  it("returns AI suggestion response", async () => {
    prismaMock.project.findUnique.mockResolvedValue({
      id: "project-1",
      name: "Hypertension review",
      description: "Lifestyle interventions research synthesis.",
    });
    prismaMock.researchPlan.findUnique.mockResolvedValue(null);
    planGeneratorMock.generateResearchPlanSuggestion.mockResolvedValue({
      ...DEFAULT_PLAN,
      targetSources: ["pubmed"],
      rationale: "Generated plan",
    });

    const response = await POST(
      new Request("http://test.local", {
        method: "POST",
        body: JSON.stringify({
          plan: { scope: "Custom scope" },
        }),
      }),
      params,
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.plan).toMatchObject({
      targetSources: ["pubmed"],
      rationale: "Generated plan",
    });
    expect(planGeneratorMock.generateResearchPlanSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: { scope: "Custom scope" },
        project: expect.objectContaining({ id: "project-1" }),
      }),
    );
    expect(activityMock.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        action: "plan.generated",
      }),
    );
  });
});
