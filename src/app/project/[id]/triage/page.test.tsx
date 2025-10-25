import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TriagePage from "./page";

const useParamsMock = vi.fn();
const useProjectMock = vi.fn();
const useCandidatesMock = vi.fn();
const useEnqueueSearchMock = vi.fn();

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

vi.mock("@/hooks/use-candidates", () => ({
  useCandidates: (...args: unknown[]) => useCandidatesMock(...args),
  useEnqueueSearch: (...args: unknown[]) => useEnqueueSearchMock(...args),
}));

vi.mock("@/components/triage/candidate-card", () => ({
  CandidateCard: () => <div data-testid="candidate-card" />,
}));

vi.mock("@/components/triage/candidate-skeleton", () => ({
  CandidateSkeleton: () => <div data-testid="candidate-skeleton" />,
}));

describe("TriagePage adapter selection", () => {
  beforeEach(() => {
    useParamsMock.mockReturnValue({ id: "project-1" });
    useProjectMock.mockReturnValue({ data: { name: "Project" }, isLoading: false });
    useCandidatesMock.mockReturnValue({
      data: { candidates: [], total: 0 },
      isLoading: false,
      isRefetching: false,
    });
    useEnqueueSearchMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    window.localStorage.clear();
  });

  it("toggles adapter buttons and updates pressed state", async () => {
    render(<TriagePage />);

    const forms = document.querySelectorAll("form");
    const form = forms[forms.length - 1] ?? null;
    expect(form).not.toBeNull();
    const utils = within(form as HTMLElement);

    const pubmedButton = await utils.findByRole("button", { name: /pubmed/i });
    expect(pubmedButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(pubmedButton);
    expect(pubmedButton).toHaveAttribute("aria-pressed", "false");
  });

  it("passes selected adapters to the search mutation", async () => {
    const mutate = vi.fn();
    useEnqueueSearchMock.mockReturnValue({ mutate, isPending: false, isSuccess: false, isError: false });

    render(<TriagePage />);

    const forms = document.querySelectorAll("form");
    const form = forms[forms.length - 1] ?? null;
    expect(form).not.toBeNull();
    const utils = within(form as HTMLElement);

    const pubmedButton = await utils.findByRole("button", { name: /pubmed/i });
    fireEvent.click(pubmedButton);

    await waitFor(() => {
      const stored = window.localStorage.getItem("litrev.adapters.project-1");
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored as string)).toEqual(["crossref"]);
    });

    const submitButton = utils.getByRole("button", { name: /run search/i });
    fireEvent.click(submitButton);

    expect(mutate).toHaveBeenCalledWith({
      projectId: "project-1",
      query: {
        terms: "hypertension lifestyle modifications",
        pageSize: 20,
      },
      adapters: ["crossref"],
    });
  });

  it("blocks submission when all adapters are deselected", async () => {
    const mutate = vi.fn();
    useEnqueueSearchMock.mockReturnValue({ mutate, isPending: false, isSuccess: false, isError: false });

    render(<TriagePage />);

    const forms = document.querySelectorAll("form");
    const form = forms[forms.length - 1] ?? null;
    expect(form).not.toBeNull();
    const utils = within(form as HTMLElement);

    const pubmedButton = await utils.findByRole("button", { name: /pubmed/i });
    const crossrefButton = utils.getByRole("button", { name: /crossref/i });

    fireEvent.click(pubmedButton);
    fireEvent.click(crossrefButton);

    const submitButton = utils.getByRole("button", { name: /run search/i });
    fireEvent.click(submitButton);

    expect(utils.getByText(/select at least one adapter/i)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("hydrates adapters from stored project preference", async () => {
    const mutate = vi.fn();
    useEnqueueSearchMock.mockReturnValue({ mutate, isPending: false, isSuccess: false, isError: false });
    window.localStorage.setItem("litrev.adapters.project-1", JSON.stringify(["crossref"]));

    render(<TriagePage />);

    const forms = document.querySelectorAll("form");
    const form = forms[forms.length - 1] ?? null;
    expect(form).not.toBeNull();
    const utils = within(form as HTMLElement);
    await waitFor(() => {
      const stored = window.localStorage.getItem("litrev.adapters.project-1");
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored as string)).toEqual(["crossref"]);
    });

    const submitButton = utils.getByRole("button", { name: /run search/i });
    fireEvent.click(submitButton);

    expect(mutate).toHaveBeenCalledWith({
      projectId: "project-1",
      query: {
        terms: "hypertension lifestyle modifications",
        pageSize: 20,
      },
      adapters: ["crossref"],
    });
  });
});
