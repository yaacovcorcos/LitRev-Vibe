import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_PLAN_RESPONSE } from "@/lib/planning/plan";
import { GET, PUT } from "./route";

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
  researchPlan: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const params = { params: { id: "project-1" } };

const planRecord = {
  id: "plan-1",
  projectId: "project-1",
  scope: "Stored scope",
  questions: "Stored questions",
  queryStrategy: "Stored query strategy",
  outline: "Stored outline",
  targetSources: ["pubmed"],
  status: "draft",
  createdAt: new Date("2025-10-16T00:00:00Z"),
  updatedAt: new Date("2025-10-16T00:00:00Z"),
};

describe("/api/projects/:id/planning", () => {
  beforeEach(() => {
    for (const group of Object.values(prismaMock)) {
      Object.values(group).forEach((fn) => fn.mockReset());
    }
  });

  describe("GET", () => {
    it("returns 404 when project is missing", async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await GET(new Request("http://test.local"), params);

      expect(response.status).toBe(404);
      expect(prismaMock.researchPlan.findUnique).not.toHaveBeenCalled();
    });

    it("returns default plan when none is stored", async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });
      prismaMock.researchPlan.findUnique.mockResolvedValue(null);

      const response = await GET(new Request("http://test.local"), params);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toEqual(EMPTY_PLAN_RESPONSE);
    });

    it("returns normalized plan content", async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });
      prismaMock.researchPlan.findUnique.mockResolvedValue(planRecord);

      const response = await GET(new Request("http://test.local"), params);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        id: "plan-1",
        scope: "Stored scope",
        questions: "Stored questions",
        queryStrategy: "Stored query strategy",
        outline: "Stored outline",
        targetSources: ["pubmed"],
        status: "draft",
        createdAt: planRecord.createdAt.toISOString(),
        updatedAt: planRecord.updatedAt.toISOString(),
      });
    });
  });

  describe("PUT", () => {
    it("returns 404 when project is missing", async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await PUT(
        new Request("http://test.local", {
          method: "PUT",
          body: JSON.stringify({}),
        }),
        params,
      );

      expect(response.status).toBe(404);
      expect(prismaMock.researchPlan.upsert).not.toHaveBeenCalled();
    });

    it("creates or updates a plan for the project", async () => {
      prismaMock.project.findUnique.mockResolvedValue({ id: "project-1" });
      prismaMock.researchPlan.upsert.mockResolvedValue(planRecord);

      const response = await PUT(
        new Request("http://test.local", {
          method: "PUT",
          body: JSON.stringify({
            scope: "New scope",
            questions: "New questions",
            queryStrategy: "New query",
            outline: "New outline",
            targetSources: ["pubmed", "crossref"],
          }),
        }),
        params,
      );

      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(prismaMock.researchPlan.upsert).toHaveBeenCalledWith({
        where: { projectId: "project-1" },
        update: expect.objectContaining({
          scope: "New scope",
          questions: "New questions",
          queryStrategy: "New query",
          outline: "New outline",
          status: "draft",
          targetSources: ["pubmed", "crossref"],
        }),
        create: expect.objectContaining({
          projectId: "project-1",
          scope: "New scope",
          questions: "New questions",
          queryStrategy: "New query",
          outline: "New outline",
          targetSources: ["pubmed", "crossref"],
          status: "draft",
        }),
      });
      expect(payload).toMatchObject({
        id: "plan-1",
        scope: "Stored scope",
        questions: "Stored questions",
        queryStrategy: "Stored query strategy",
        outline: "Stored outline",
        targetSources: ["pubmed"],
      });
    });
  });
});
