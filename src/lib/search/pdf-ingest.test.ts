import { beforeEach, describe, expect, it, vi } from "vitest";

import { PDF_INGEST_JOB_NAME, enqueuePdfIngestJob, processPdfIngestJob } from "./pdf-ingest";

vi.mock("pdf-parse", () => ({
  __esModule: true,
  default: vi.fn(async () => ({ text: "Extracted PDF text" })),
}));

vi.mock("@/lib/queue/queue", () => {
  const queueMock = {
    add: vi.fn(async () => ({ id: "job-queue-1" })),
  };

  (globalThis as any).__queueMock = queueMock;

  return {
    queues: {
      default: queueMock,
    },
  };
});

vi.mock("@/lib/storage/pdf", () => {
  const storageMock = {
    storeCandidatePdf: vi.fn(async () => ({
      storagePath: "project-1/candidate-1.pdf",
      storageUrl: null,
    })),
  };

  (globalThis as any).__storageMock = storageMock;

  return storageMock;
});

vi.mock("@/lib/snippets/extractor", () => {
  const snippetMock = {
    extractLocatorSnippets: vi.fn(async () => [{ candidateId: "candidate-1", snippetCount: 3 }]),
  };

  (globalThis as any).__snippetMock = snippetMock;

  return snippetMock;
});

vi.mock("@/lib/prisma", () => {
  const candidateMock = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(async () => ({})),
  };

  (globalThis as any).__candidateMock = candidateMock;

  return {
    prisma: {
      candidate: candidateMock,
    },
  };
});

function getQueueMock() {
  return (globalThis as any).__queueMock as { add: ReturnType<typeof vi.fn> };
}

function getStorageMock() {
  return (globalThis as any).__storageMock as { storeCandidatePdf: ReturnType<typeof vi.fn> };
}

function getSnippetMock() {
  return (globalThis as any).__snippetMock as { extractLocatorSnippets: ReturnType<typeof vi.fn> };
}

function getCandidateMock() {
  return (globalThis as any).__candidateMock as {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

describe("pdf ingest jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(global, "fetch", {
      writable: true,
      value: vi.fn(async () =>
        new Response("%PDF-1.4", {
          status: 200,
          headers: {
            "content-type": "application/pdf",
          },
        }),
      ),
    });
  });

  it("enqueues ingest work onto the default queue", async () => {
    await enqueuePdfIngestJob({
      projectId: "project-1",
      candidateId: "candidate-1",
      searchAdapter: "crossref",
      externalId: "ext-1",
      url: "https://example.com/sample.pdf",
      doi: "10.1000/xyz",
    });

    expect(getQueueMock().add).toHaveBeenCalledWith(
      PDF_INGEST_JOB_NAME,
      expect.objectContaining({
        projectId: "project-1",
        candidateId: "candidate-1",
        searchAdapter: "crossref",
        url: "https://example.com/sample.pdf",
      }),
      expect.objectContaining({ attempts: 2 }),
    );
  });

  it("stores PDF artifact, updates metadata, and extracts snippets", async () => {
    const candidateMock = getCandidateMock();
    candidateMock.findUnique.mockResolvedValueOnce({
      id: "candidate-1",
      projectId: "project-1",
      metadata: {
        existing: true,
      },
    });

    await processPdfIngestJob({
      projectId: "project-1",
      candidateId: "candidate-1",
      searchAdapter: "crossref",
      externalId: "ext-1",
      url: "https://example.com/sample.pdf",
      doi: "10.1000/xyz",
    });

    expect(getStorageMock().storeCandidatePdf).toHaveBeenCalledWith("project-1", "candidate-1", expect.any(Buffer));

    expect(candidateMock.update).toHaveBeenCalledWith({
      where: { id: "candidate-1" },
      data: {
        metadata: expect.objectContaining({
          existing: true,
          pdf: expect.objectContaining({
            storagePath: "project-1/candidate-1.pdf",
            sourceUrl: "https://example.com/sample.pdf",
          }),
          pdfText: expect.stringContaining("Extracted PDF text"),
        }),
      },
    });

    expect(getSnippetMock().extractLocatorSnippets).toHaveBeenCalledWith({
      projectId: "project-1",
      candidateIds: ["candidate-1"],
    });
  });

  it("resolves candidate via external id when candidateId is missing", async () => {
    const candidateMock = getCandidateMock();
    candidateMock.findUnique.mockResolvedValueOnce(null);
    candidateMock.findFirst.mockResolvedValueOnce({
      id: "candidate-lookup",
      projectId: "project-1",
      metadata: null,
    });

    await processPdfIngestJob({
      projectId: "project-1",
      searchAdapter: "crossref",
      externalId: "ext-lookup",
      url: "https://example.com/sample.pdf",
      doi: null,
    });

    expect(candidateMock.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        projectId: "project-1",
        searchAdapter: "crossref",
      }),
    }));
    expect(getStorageMock().storeCandidatePdf).toHaveBeenCalledWith("project-1", "candidate-lookup", expect.any(Buffer));
  });

  it("throws when candidate cannot be resolved", async () => {
    const candidateMock = getCandidateMock();
    candidateMock.findUnique.mockResolvedValueOnce(null);
    candidateMock.findFirst.mockResolvedValueOnce(null);

    await expect(() =>
      processPdfIngestJob({
        projectId: "project-1",
        searchAdapter: "crossref",
        externalId: "missing",
        url: "https://example.com/sample.pdf",
      }),
    ).rejects.toThrow(/Candidate not found/);
  });
});
