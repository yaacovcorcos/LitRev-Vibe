import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

import ProjectExportPage from "./page";

const useParamsMock = vi.fn();
const useProjectMock = vi.fn();
const useExportHistoryMock = vi.fn();
const useExportMetricsMock = vi.fn();
const usePrismaDiagramMock = vi.fn();
const useEnqueueExportMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => useParamsMock(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string; children: ReactNode }) => (
    <a href={href ?? ""}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-projects", () => ({
  useProject: (projectId: string | null) => useProjectMock(projectId),
}));

vi.mock("@/hooks/use-exports", () => ({
  useExportHistory: (...args: unknown[]) => useExportHistoryMock(...args),
  useExportMetrics: (...args: unknown[]) => useExportMetricsMock(...args),
  usePrismaDiagram: (...args: unknown[]) => usePrismaDiagramMock(...args),
  useEnqueueExport: (...args: unknown[]) => useEnqueueExportMock(...args),
}));

const baselineMetrics = {
  totalIdentified: 150,
  totalStored: 90,
  candidateCounts: {
    pending: 10,
    kept: 60,
    discarded: 20,
    needs_review: 0,
  },
  screened: 80,
  included: 40,
  pending: 10,
  lastSearchCompletedAt: "2024-01-08T12:00:00.000Z",
};

describe("ProjectExportPage history timeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));

    useParamsMock.mockReturnValue({ id: "project-123" });
    useProjectMock.mockReturnValue({
      data: {
        id: "project-123",
        name: "Hypertension review",
        settings: {
          locatorPolicy: "permissive",
          exports: {
            enabledFormats: ["docx", "markdown", "bibtex"],
            defaultFormat: "docx",
            includeLedgerExport: true,
            includePrismaDiagram: true,
          },
        },
      },
      isLoading: false,
    });

    useExportMetricsMock.mockReturnValue({
      data: { metrics: baselineMetrics },
      isLoading: false,
    });

    usePrismaDiagramMock.mockReturnValue({
      data: { svg: "<svg>PRISMA flow diagram</svg>" },
      isLoading: false,
    });

    useEnqueueExportMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("renders completed exports with bundle metadata", () => {
    useExportHistoryMock.mockReturnValue({
      data: {
        exports: [
          {
            id: "export-1",
            format: "docx",
            status: "completed",
            options: {
              includeLedger: true,
              includePrismaDiagram: true,
              files: [
                { name: "manuscript/manuscript.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
                { name: "attachments/bibliography.bib", contentType: "text/plain" },
              ],
            },
            storagePath: "/exports/export-1.zip",
            storageUrl: null,
            jobId: "job-1",
            createdAt: "2024-01-10T10:00:00Z",
            completedAt: "2024-01-10T10:02:30Z",
            error: null,
            job: {
              id: "job-1",
              status: "completed",
              progress: 1,
              createdAt: "2024-01-10T10:00:00Z",
              updatedAt: "2024-01-10T10:02:30Z",
              completedAt: "2024-01-10T10:02:30Z",
            },
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<ProjectExportPage />);

    const entry = screen.getByText(/completed in 2m 30s/i).closest("li");
    expect(entry).not.toBeNull();
    const utils = within(entry as HTMLElement);

    expect(utils.getAllByText(/docx/i)[0]).toBeInTheDocument();
    expect(utils.getByText(/ledger attached/i)).toBeInTheDocument();
    expect(utils.getByText(/prisma included/i)).toBeInTheDocument();
    expect(utils.getByText(/completed in 2m 30s/i)).toBeInTheDocument();
    expect(utils.getByText(/about 2 hours ago/i)).toBeInTheDocument();

    const download = utils.getByRole("link", { name: /download bundle/i });
    expect(download).toHaveAttribute("href", "/api/projects/project-123/exports/export-1/download");
  });

  it("shows progress for active exports", () => {
    useExportHistoryMock.mockReturnValue({
      data: {
        exports: [
          {
            id: "export-2",
            format: "markdown",
            status: "in_progress",
            options: {
              includeLedger: true,
              includePrismaDiagram: false,
              files: [],
            },
            storagePath: null,
            storageUrl: null,
            jobId: "job-2",
            createdAt: "2024-01-10T11:00:00Z",
            completedAt: null,
            error: null,
            job: {
              id: "job-2",
              status: "processing",
              progress: 0.45,
              createdAt: "2024-01-10T11:00:00Z",
              updatedAt: "2024-01-10T11:30:00Z",
              completedAt: null,
            },
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<ProjectExportPage />);

    const entry = screen.getByText(/processing export/i).closest("li");
    expect(entry).not.toBeNull();
    const utils = within(entry as HTMLElement);
    expect(utils.getAllByText(/markdown/i)[0]).toBeInTheDocument();
    expect(utils.getByText(/processing export \(45%\)/i)).toBeInTheDocument();
    expect(utils.getByText(/ledger attached/i)).toBeInTheDocument();
    expect(utils.getByText(/prisma skipped/i)).toBeInTheDocument();
    const progressBar = utils.getByRole("presentation", { hidden: true });
    expect(progressBar).toHaveStyle({ width: "45%" });
  });

  it("renders empty state when no exports exist", () => {
    useExportHistoryMock.mockReturnValue({
      data: { exports: [] },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<ProjectExportPage />);

    expect(screen.getByText(/no exports yet/i)).toBeInTheDocument();
  });
});
