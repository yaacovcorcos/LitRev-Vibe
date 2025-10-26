import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const prismaMock = vi.hoisted(() => ({
  export: {
    findUnique: vi.fn(),
  },
}));

const readFileMock = vi.hoisted(() => vi.fn());
const resolvePathMock = vi.hoisted(() => vi.fn((storagePath: string) => `/exports/${storagePath}`));
const inferContentTypeMock = vi.hoisted(() => vi.fn(() => "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));

vi.mock("fs", () => ({
  promises: {
    readFile: (...args: unknown[]) => readFileMock(...args),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/export/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export/storage")>("@/lib/export/storage");
  return {
    ...actual,
    resolveStoredExportPath: resolvePathMock,
    inferContentType: inferContentTypeMock,
  };
});

const params = {
  params: {
    id: "project-1",
    exportId: "export-1",
  },
};

const BASE_EXPORT = {
  id: "export-1",
  projectId: "project-1",
  format: "docx" as const,
  status: "completed" as const,
  storagePath: "project-1/export-1.zip",
  project: {
    id: "project-1",
    name: "Lit Review",
  },
};

describe("GET /api/projects/:id/exports/:exportId/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.export.findUnique.mockResolvedValue({ ...BASE_EXPORT });
    readFileMock.mockResolvedValue(Buffer.from("fake-zip"));
    inferContentTypeMock.mockReturnValue("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });

  it("returns 404 when export is missing", async () => {
    prismaMock.export.findUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://test.local"), params);
    expect(response.status).toBe(404);
  });

  it("returns 404 when export belongs to a different project", async () => {
    prismaMock.export.findUnique.mockResolvedValueOnce({
      ...BASE_EXPORT,
      projectId: "other-project",
      project: { id: "other-project", name: "Other" },
    });

    const response = await GET(new Request("http://test.local"), params);
    expect(response.status).toBe(404);
  });

  it("returns 404 when artifact path missing", async () => {
    prismaMock.export.findUnique.mockResolvedValueOnce({
      ...BASE_EXPORT,
      storagePath: null,
    });

    const response = await GET(new Request("http://test.local"), params);
    expect(response.status).toBe(404);
  });

  it("returns 200 with binary payload when artifact available", async () => {
    readFileMock.mockResolvedValueOnce(Buffer.from("zip-bytes"));

    const response = await GET(new Request("http://test.local"), params);
    expect(response.status).toBe(200);
    expect(readFileMock).toHaveBeenCalledWith("/exports/project-1/export-1.zip");
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Content-Disposition")).toMatch(/attachment/);
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.toString()).toBe("zip-bytes");
  });

  it("returns 500 when storage read fails", async () => {
    readFileMock.mockRejectedValueOnce(new Error("missing"));

    const response = await GET(new Request("http://test.local"), params);
    expect(response.status).toBe(500);
  });
});
