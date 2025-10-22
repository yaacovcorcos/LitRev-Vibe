import { beforeEach, describe, expect, it, vi } from "vitest";

import { appRouter } from "@/server/trpc/router";

const prismaMock = vi.hoisted(() => ({
  project: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const activityMock = vi.hoisted(() => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: activityMock.logActivity,
}));

const basePlanSettings = {
  locatorPolicy: "strict",
  citationStyle: "apa",
  exports: {
    enabledFormats: ["docx"],
    defaultFormat: "docx",
    includePrismaDiagram: true,
    includeLedgerExport: true,
  },
};

describe("projectRouter", () => {
  beforeEach(() => {
    Object.values(prismaMock.project).forEach((fn) => fn.mockReset());
    activityMock.logActivity.mockReset();
  });

  function createCaller() {
    return appRouter.createCaller({ prisma: prismaMock } as any);
  }

  it("lists projects", async () => {
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: "p1",
        name: "Project 1",
        description: null,
        settings: basePlanSettings,
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-02T00:00:00Z"),
      },
    ]);

    const caller = createCaller();
    const projects = await caller.project.list();

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({
      id: "p1",
      settings: expect.objectContaining({ locatorPolicy: "strict" }),
    });
  });

  it("creates project and logs activity", async () => {
    prismaMock.project.create.mockResolvedValue({
      id: "p2",
      name: "New",
      description: null,
      settings: basePlanSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createCaller();
    const project = await caller.project.create({ name: "New" });

    expect(project.id).toBe("p2");
    expect(activityMock.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.created", projectId: "p2" }),
    );
  });

  it("updates project without resetting status", async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce({
      id: "p3",
      name: "Existing",
      description: null,
      settings: basePlanSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.project.update.mockResolvedValue({
      id: "p3",
      name: "Renamed",
      description: null,
      settings: basePlanSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = createCaller();
    const project = await caller.project.update({ id: "p3", name: "Renamed" });

    expect(project.name).toBe("Renamed");
    expect(prismaMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Renamed" }),
      }),
    );
    expect(activityMock.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.updated", projectId: "p3" }),
    );
  });

  it("deletes project and logs activity", async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce({ id: "p4", name: "Delete" });
    prismaMock.project.delete.mockResolvedValue(undefined);

    const caller = createCaller();
    await caller.project.delete({ id: "p4" });

    expect(prismaMock.project.delete).toHaveBeenCalledWith({ where: { id: "p4" } });
    expect(activityMock.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.deleted", projectId: "p4" }),
    );
  });
});
