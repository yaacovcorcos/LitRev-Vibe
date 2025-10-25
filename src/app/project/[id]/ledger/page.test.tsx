import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LedgerPage from "./page";

const useParamsMock = vi.fn();
const useProjectMock = vi.fn();
const useLedgerEntriesMock = vi.fn();
const useAddLocatorMock = vi.fn();
const useVerifyLocatorMock = vi.fn();
const useReturnLedgerEntryMock = vi.fn();
const toastMock = vi.fn();
const isoTimestamp = "2024-01-05 12:00:00";

vi.mock("next/navigation", () => ({
  useParams: () => useParamsMock(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string; children: ReactNode }) => <a href={href ?? ""}>{children}</a>,
}));

vi.mock("@/hooks/use-projects", () => ({
  useProject: (projectId: string | null) => useProjectMock(projectId),
}));

vi.mock("@/hooks/use-ledger", () => ({
  useLedgerEntries: (...args: unknown[]) => useLedgerEntriesMock(...args),
  useAddLocator: (...args: unknown[]) => useAddLocatorMock(...args),
  useVerifyLocator: (...args: unknown[]) => useVerifyLocatorMock(...args),
}));

vi.mock("@/hooks/use-return-ledger-entry", () => ({
  useReturnLedgerEntry: (...args: unknown[]) => useReturnLedgerEntryMock(...args),
}));

vi.mock("@/components/ledger/locator-banner", () => ({
  LocatorBanner: ({ display, actionSlot }: { display: { label: string }; actionSlot?: ReactNode }) => (
    <div>
      <span>{display.label}</span>
      {actionSlot}
    </div>
  ),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const ledgerEntry = {
  id: "entry-1",
  projectId: "project-1",
  citationKey: "citation_test",
  metadata: { title: "Sample Study" },
  provenance: {},
  locators: [
    {
      page: 2,
      note: "Summarized snippet",
    },
  ],
  integrityNotes: [
    {
      label: "Missing locator",
      severity: "warning",
      source: "curator",
      reason: "Locator details incomplete",
    },
  ],
  importedFrom: null,
  keptAt: isoTimestamp,
  verifiedByHuman: false,
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  candidateId: "candidate-1",
};

describe("LedgerPage curator actions", () => {
  beforeEach(() => {
    useParamsMock.mockReturnValue({ id: "project-1" });
    useProjectMock.mockReturnValue({ data: { name: "Project" }, isLoading: false });
    useLedgerEntriesMock.mockReturnValue({
      data: { entries: [ledgerEntry], total: 1, page: 0, pageSize: 20 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isRefetching: false,
    });
    useAddLocatorMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      reset: vi.fn(),
      isError: false,
      error: null,
    });
    useVerifyLocatorMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useReturnLedgerEntryMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    toastMock.mockReset();
  });

  it("renders curator action controls when entry is linked to a candidate", () => {
    render(<LedgerPage />);

    expect(screen.getByText(/curator actions/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to pending/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mark needs review/i })).toBeInTheDocument();
  });

  it("shows locator checklist guidance", () => {
    render(<LedgerPage />);

    const [checklistHeading] = screen.getAllByText(/locator checklist/i);
    expect(checklistHeading).toBeInTheDocument();
    const [pointerItem] = screen.getAllByText(/includes a page/i);
    expect(pointerItem).toBeInTheDocument();
  });

  it("submits a return request with the chosen status", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ candidateId: "candidate-1", status: "pending" });
    useReturnLedgerEntryMock.mockReturnValue({ mutateAsync, isPending: false });

    render(<LedgerPage />);

    const noteField = screen.getByLabelText(/note to triage reviewers/i);
    fireEvent.change(noteField, { target: { value: "Needs locator check" } });

    const [curatorHeading] = screen.getAllByText(/curator actions/i);
    const actionsSection = curatorHeading.closest("div");
    expect(actionsSection).not.toBeNull();
    const utils = within(actionsSection as HTMLElement);

    const button = utils.getByRole("button", { name: /return to pending/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        projectId: "project-1",
        entryId: "entry-1",
        status: "pending",
        note: "Needs locator check",
      });
    });
  });

  it("highlights integrity flags in the inspector header", () => {
    render(<LedgerPage />);

    const badges = screen.getAllByText(/Missing locator/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("prevents verification when locator details are incomplete", async () => {
    const mutate = vi.fn();
    useVerifyLocatorMock.mockReturnValue({ mutate, isPending: false });
    useLedgerEntriesMock.mockReset();
    useLedgerEntriesMock.mockReturnValue({
      data: {
        entries: [
          {
            ...ledgerEntry,
            locators: [
              {
                note: "Missing pointer",
              },
            ],
          },
        ],
        total: 1,
        page: 0,
        pageSize: 20,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isRefetching: false,
    });

    render(<LedgerPage />);

    const verifyButtons = await screen.findAllByRole("button", { name: /mark as verified/i });
    expect(verifyButtons.length).toBeGreaterThan(0);
    verifyButtons.forEach((button) => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});
