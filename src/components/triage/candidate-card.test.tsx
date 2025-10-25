import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Candidate } from "@/hooks/use-candidates";

import { CandidateCard } from "./candidate-card";

const useCandidateRationaleMock = vi.fn();
const useAskCandidateAIMock = vi.fn();
const useKeepCandidateMock = vi.fn();
const useSnippetExtractionMock = vi.fn();
const useDiscardCandidateMock = vi.fn();
const useNeedsReviewCandidateMock = vi.fn();

vi.mock("@/hooks/use-candidate-rationale", () => ({
  useCandidateRationale: (...args: unknown[]) => useCandidateRationaleMock(...args),
  useAskCandidateAI: (...args: unknown[]) => useAskCandidateAIMock(...args),
}));

vi.mock("@/hooks/use-keep-candidate", () => ({
  useKeepCandidate: (...args: unknown[]) => useKeepCandidateMock(...args),
}));

vi.mock("@/hooks/use-snippet-extraction", () => ({
  useSnippetExtraction: (...args: unknown[]) => useSnippetExtractionMock(...args),
}));

vi.mock("@/hooks/use-discard-candidate", () => ({
  useDiscardCandidate: (...args: unknown[]) => useDiscardCandidateMock(...args),
}));

vi.mock("@/hooks/use-needs-review-candidate", () => ({
  useNeedsReviewCandidate: (...args: unknown[]) => useNeedsReviewCandidateMock(...args),
}));

const baseCandidate: Candidate = {
  id: "candidate-1",
  projectId: "project-1",
  searchAdapter: "pubmed",
  externalIds: {},
  metadata: {
    title: "Sample reference",
    authors: ["Doe"],
    journal: "Journal",
    publishedAt: "2024",
  },
  oaLinks: null,
  integrityFlags: [],
  aiRationale: null,
  locatorSnippets: null,
  triageStatus: "pending",
  createdAt: new Date().toISOString(),
};

describe("CandidateCard triage actions", () => {
  beforeEach(() => {
    useCandidateRationaleMock.mockReturnValue({ data: null, isLoading: false, isError: false });
    useAskCandidateAIMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useKeepCandidateMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false, isError: false });
    useSnippetExtractionMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useDiscardCandidateMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useNeedsReviewCandidateMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it("marks a candidate as needs review with optional note", async () => {
    const needsReviewMutation = vi.fn().mockResolvedValue({});
    useNeedsReviewCandidateMock.mockReturnValue({ mutateAsync: needsReviewMutation, isPending: false });

    render(<CandidateCard projectId="project-1" candidate={baseCandidate} />);

    const cards = screen.getAllByTestId("candidate-card");
    const card = cards[cards.length - 1];
    const utils = within(card);

    const noteField = utils.getByTestId("candidate-1-triage-note-input");
    fireEvent.change(noteField, { target: { value: "Check eligibility" } });

    fireEvent.click(utils.getByRole("button", { name: /needs review/i }));

    await waitFor(() => {
      expect(needsReviewMutation).toHaveBeenCalledWith({
        projectId: "project-1",
        candidateId: "candidate-1",
        note: "Check eligibility",
      });
    });

    await waitFor(() => expect(noteField).toHaveValue(""));
    expect(screen.getByText(/marked as needs review/i)).toBeInTheDocument();
  });

  it("discards a candidate and records reason", async () => {
    const discardMutation = vi.fn().mockResolvedValue({});
    useDiscardCandidateMock.mockReturnValue({ mutateAsync: discardMutation, isPending: false });

    render(<CandidateCard projectId="project-1" candidate={baseCandidate} />);

    const cards = screen.getAllByTestId("candidate-card");
    const card = cards[cards.length - 1];
    const utils = within(card);

    const noteField = utils.getByTestId("candidate-1-triage-note-input");
    fireEvent.change(noteField, { target: { value: "Irrelevant scope" } });

    fireEvent.click(utils.getByRole("button", { name: /discard/i }));

    await waitFor(() => {
      expect(discardMutation).toHaveBeenCalledWith({
        projectId: "project-1",
        candidateId: "candidate-1",
        reason: "Irrelevant scope",
      });
    });

    expect(screen.getByText(/discarded candidate/i)).toBeInTheDocument();
  });

  it("shows passive status messaging when not pending", () => {
    const keptCandidate: Candidate = {
      ...baseCandidate,
      triageStatus: "needs_review",
    };

    render(<CandidateCard projectId="project-1" candidate={keptCandidate} />);

    const cards = screen.getAllByTestId("candidate-card");
    const card = cards[cards.length - 1];
    const utils = within(card);

    expect(utils.getByText(/^needs review$/i)).toBeInTheDocument();
    expect(utils.getByText(/status is needs review/i)).toBeInTheDocument();
    expect(utils.queryByRole("button", { name: /needs review/i })).not.toBeInTheDocument();
  });
});
