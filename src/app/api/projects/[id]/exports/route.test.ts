import { describe, expect, it, beforeEach, vi } from "vitest";

import { GET, POST } from "./route";
import { ExportGuardError } from "@/lib/export/guards";

const prismaMock = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
  export: {
    findMany: vi.fn(),
  },
}));

const enqueueExportJobMock = vi.hoisted(() => vi.fn());
const assertExportAllowedMock = vi.hoisted(() => vi.fn());
const supportedFormatsMock = vi.hoisted(() => vi.fn(() => ["docx", "markdown"]));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/export/jobs", () => ({
  enqueueExportJob: enqueueExportJobMock,
}));

vi.mock("@/lib/export/guards", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export/guards")>("@/lib/export/guards");
  return {
    ...actual,
    assertExportAllowed: assertExportAllowedMock,
  };
});

vi.mock("@/lib/export/adapters", () => ({
  supportedExportFormats: supportedFormatsMock,
}));

const params = {
  params: {
    id: "project-1",
  },
};

describe("POST /api/projects/:id/exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    supportedFormatsMock.mockReturnValue(["docx", "markdown"]);

    prismaMock.project.findUnique.mockResolvedValue({
      id: "project-1",
      settings: {
        exports: {
          enabledFormats: ["docx", "markdown"],
          defaultFormat: "docx",
          includeLedgerExport: true,
          includePrismaDiagram: true,
        },
        locatorPolicy: "strict",
        citationStyle: "apa",
      },
    });

    enqueueExportJobMock.mockResolvedValue({ jobId: "job-1", exportId: "export-1" });
    assertExportAllowedMock.mockResolvedValue(undefined);
  });

  it("returns 404 when project missing", async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce(null);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "docx" }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(404);
  });

  it("returns 400 for disabled format", async () => {
    prismaMock.project.findUnique.mockResolvedValueOnce({
      id: "project-1",
      settings: {
        exports: {
          enabledFormats: ["markdown"],
          defaultFormat: "markdown",
          includeLedgerExport: true,
          includePrismaDiagram: true,
        },
        locatorPolicy: "strict",
        citationStyle: "apa",
      },
    });

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "docx" }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(400);
  });

  it("returns 400 when adapter unsupported", async () => {
    supportedFormatsMock.mockReturnValueOnce(["markdown"]);

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "docx" }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(400);
  });

  it("returns 409 when guard blocks export", async () => {
    assertExportAllowedMock.mockRejectedValueOnce(new ExportGuardError("blocked"));

    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "docx" }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(409);
  });

  it("enqueues export with defaults", async () => {
    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "docx" }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(202);
    expect(enqueueExportJobMock).toHaveBeenCalledWith({
      projectId: "project-1",
      format: "docx",
      includePrismaDiagram: true,
      includeLedger: true,
      actor: undefined,
    });
  });

  it("respects payload overrides", async () => {
    const request = new Request("http://test.local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "markdown",
        includeLedger: false,
        includePrismaDiagram: false,
        actor: "user",
      }),
    });

    const response = await POST(request, params);
    expect(response.status).toBe(202);
    expect(enqueueExportJobMock).toHaveBeenCalledWith({
      projectId: "project-1",
      format: "markdown",
      includeLedger: false,
      includePrismaDiagram: false,
      actor: "user",
    });
  });
});

describe("GET /api/projects/:id/exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.export.findMany.mockResolvedValue([
      {
        id: "export-1",
        format: "docx",
        options: { includeLedger: true },
        status: "completed",
        storagePath: "project-1/export-1.docx",
        storageUrl: null,
        jobId: "job-123",
        createdAt: new Date("2024-01-01T00:00:00Z"),
        completedAt: new Date("2024-01-01T00:05:00Z"),
        job: {
          id: "job-123",
          status: "completed",
          progress: 1,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:05:00Z"),
          completedAt: new Date("2024-01-01T00:05:00Z"),
        },
        error: null,
      },
    ]);
  });

  it("validates query params", async () => {
    const response = await GET(new Request("http://test.local?limit=0"), params);
    expect(response.status).toBe(400);
  });

  it("returns export history", async () => {
    const response = await GET(new Request("http://test.local?limit=5"), params);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(Array.isArray(json.exports)).toBe(true);
    expect(json.exports[0]).toMatchObject({
      id: "export-1",
      format: "docx",
      status: "completed",
      jobId: "job-123",
    });
    expect(prismaMock.export.findMany).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        job: {
          select: {
            id: true,
            status: true,
            progress: true,
            createdAt: true,
            updatedAt: true,
            completedAt: true,
          },
        },
      },
    });
  });
});
