import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DraftPage from "./page";

const useParamsMock = vi.fn();
const useDraftSectionsMock = vi.fn();
const useLedgerEntriesMock = vi.fn();
const useDraftSuggestionsMock = vi.fn();
const useRequestDraftSuggestionMock = vi.fn();
const useResolveDraftSuggestionMock = vi.fn();
const useEnqueueComposeJobMock = vi.fn();
const useJobStatusMock = vi.fn();
const useUpdateDraftSectionMock = vi.fn();
const useDraftVersionsMock = vi.fn();
const useRollbackDraftVersionMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => useParamsMock(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string; children: ReactNode }) => <a href={href ?? ""}>{children}</a>,
}));

vi.mock("@/components/draft/draft-editor", () => ({
  DraftEditor: () => <div data-testid="draft-editor" />,
}));

vi.mock("@/hooks/use-draft-sections", () => ({
  useDraftSections: (...args: unknown[]) => useDraftSectionsMock(...args),
  useUpdateDraftSection: (...args: unknown[]) => useUpdateDraftSectionMock(...args),
}));

vi.mock("@/hooks/use-ledger", () => ({
  useLedgerEntries: (...args: unknown[]) => useLedgerEntriesMock(...args),
}));

vi.mock("@/hooks/use-draft-suggestions", () => ({
  useDraftSuggestions: (...args: unknown[]) => useDraftSuggestionsMock(...args),
  useRequestDraftSuggestion: (...args: unknown[]) => useRequestDraftSuggestionMock(...args),
  useResolveDraftSuggestion: (...args: unknown[]) => useResolveDraftSuggestionMock(...args),
}));

vi.mock("@/hooks/use-compose", () => ({
  useEnqueueComposeJob: (...args: unknown[]) => useEnqueueComposeJobMock(...args),
  useJobStatus: (...args: unknown[]) => useJobStatusMock(...args),
}));

vi.mock("@/hooks/use-draft-versions", () => ({
  useDraftVersions: (...args: unknown[]) => useDraftVersionsMock(...args),
  useRollbackDraftVersion: (...args: unknown[]) => useRollbackDraftVersionMock(...args),
}));

const currentDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Alpha sentence." }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Beta addition." }],
    },
  ],
};

const versionSnapshots = [
  {
    id: "snapshot-5",
    draftSectionId: "section-1",
    version: 5,
    status: "draft",
    createdAt: new Date("2024-01-05T10:00:00Z").toISOString(),
    content: currentDoc,
    locators: [
      {
        page: 10,
        citationKey: "Smith2024",
        note: "Latest snapshot",
      },
    ],
  },
  {
    id: "snapshot-4",
    draftSectionId: "section-1",
    version: 4,
    status: "draft",
    createdAt: new Date("2024-01-04T10:00:00Z").toISOString(),
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Alpha sentence." }],
        },
      ],
    },
    locators: [
      {
        page: 12,
        citationKey: "Doe2021",
        note: "Earlier evidence",
      },
    ],
  },
  {
    id: "snapshot-3",
    draftSectionId: "section-1",
    version: 3,
    status: "draft",
    createdAt: new Date("2024-01-03T10:00:00Z").toISOString(),
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Alpha sentence." }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Gamma insight." }],
        },
      ],
    },
    locators: [
      {
        page: 8,
        citationKey: "Lee2019",
      },
    ],
  },
];

const sectionRecord = {
  id: "section-1",
  projectId: "project-1",
  sectionType: "literature_review",
  content: currentDoc as Record<string, unknown>,
  status: "draft",
  version: 5,
  createdAt: new Date("2024-01-05T12:00:00Z").toISOString(),
  updatedAt: new Date("2024-01-05T12:30:00Z").toISOString(),
  approvedAt: null,
  ledgerEntries: [
    {
      id: "entry-1",
      citationKey: "Smith2024",
      verifiedByHuman: true,
    },
  ],
  versionHistory: [],
};

let rollbackCalls: Array<[unknown, unknown?]> = [];

function triggerReactClick(element: HTMLElement) {
  const reactEventKey = Object.keys(element).find((key) => key.startsWith("__reactProps$"));
  if (!reactEventKey) {
    throw new Error("Unable to locate React props for element");
  }

  const props = (element as Record<string, unknown>)[reactEventKey] as Record<string, unknown> | undefined;
  const handler = props?.onClick as ((event: unknown) => void) | undefined;
  if (!handler) {
    throw new Error("Element missing onClick handler");
  }

  handler({ preventDefault() {}, stopPropagation() {} });
}

describe("DraftPage version history", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useParamsMock.mockReturnValue({ id: "project-1" });
    useDraftSectionsMock.mockReturnValue({
      data: { sections: [sectionRecord] },
      isLoading: false,
      refetch: vi.fn(),
    });
    useLedgerEntriesMock.mockReturnValue({
      data: {
        entries: [
          {
            id: "entry-1",
            citationKey: "Smith2024",
            verifiedByHuman: true,
            locators: [{ page: 5 }],
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
    useDraftSuggestionsMock.mockReturnValue({
      data: { suggestions: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    useRequestDraftSuggestionMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useResolveDraftSuggestionMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useEnqueueComposeJobMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useJobStatusMock.mockReturnValue({ data: { status: null, progress: 0 }, isLoading: false });
    useUpdateDraftSectionMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useDraftVersionsMock.mockReturnValue({
      data: { versions: versionSnapshots },
      isLoading: false,
      refetch: vi.fn(),
    });
    rollbackCalls = [];
    useRollbackDraftVersionMock.mockImplementation(() => ({
      mutate: (variables: unknown, options?: unknown) => {
        rollbackCalls.push([variables, options]);
        if (options && typeof options === "object" && "onSuccess" in options && typeof (options as Record<string, unknown>).onSuccess === "function") {
          const handler = (options as { onSuccess?: (data: unknown) => void }).onSuccess;
          handler?.({ section: { id: (variables as { sectionId?: string }).sectionId } });
        }
      },
      isPending: false,
    }));
  });

  it("renders diff previews and locator summaries for previous versions", async () => {
    render(<DraftPage />);
    expect(useRollbackDraftVersionMock).toHaveBeenCalled();

    const removalLabels = await screen.findAllByText(/Will remove:/i);
    expect(removalLabels.length).toBeGreaterThan(0);
    const removedSentences = screen.getAllByText(/Beta addition\./i);
    expect(removedSentences.length).toBeGreaterThan(0);

    await screen.findAllByText(/Restored:/i);
    const restoredSentences = screen.getAllByText(/Gamma insight\./i);
    expect(restoredSentences.length).toBeGreaterThan(0);

    const locator = screen.getByText(/Doe2021/i);
    expect(locator.textContent ?? locator.innerHTML).toMatch(/Page 12/i);
  });

  it("uses the latest prior snapshot for the quick rollback action", async () => {
    render(<DraftPage />);
    expect(useRollbackDraftVersionMock).toHaveBeenCalled();

    const projectLinks = screen.getAllByRole("link", { name: "Project" });
    expect(projectLinks.some((link) => link.getAttribute("href") === "/project/project-1/planning")).toBe(true);

    const [quickRestoreButton] = await screen.findAllByRole("button", { name: /restore latest prior version/i });
    expect(quickRestoreButton).not.toBeDisabled();
    expect(quickRestoreButton).toHaveAttribute("data-target-version", "4");
    const initialCalls = rollbackCalls.length;
    triggerReactClick(quickRestoreButton);

    await waitFor(() => {
      expect(rollbackCalls.length).toBeGreaterThan(initialCalls);
    });

    const [variables] = rollbackCalls[0];
    expect(variables).toMatchObject({
      projectId: "project-1",
      sectionId: "section-1",
      version: 4,
    });
  });

  it("restores a selected version from the history list", async () => {
    render(<DraftPage />);
    expect(useRollbackDraftVersionMock).toHaveBeenCalled();

    const projectLinks = screen.getAllByRole("link", { name: "Project" });
    expect(projectLinks.some((link) => link.getAttribute("href") === "/project/project-1/planning")).toBe(true);

    const [versionLabel] = await screen.findAllByText("v3");
    const versionItem = versionLabel.closest("li");
    expect(versionItem).not.toBeNull();

    const restoreButton = within(versionItem as HTMLElement).getByRole("button", { name: "Restore" });
    expect(restoreButton).not.toBeDisabled();
    expect(restoreButton).toHaveAttribute("data-target-version", "3");
    const initialCalls = rollbackCalls.length;
    triggerReactClick(restoreButton);

    await waitFor(() => {
      expect(rollbackCalls.length).toBeGreaterThan(initialCalls);
    });

    const lastCall = rollbackCalls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ version: 3 });
  });
});
