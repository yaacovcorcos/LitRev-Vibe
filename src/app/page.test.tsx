import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "./page";

const useHomeProjectsMock = vi.fn();
const useCreateProjectMock = vi.fn();

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string; children: ReactNode }) => (
    <a href={href ?? "#"}>{children}</a>
  ),
}));

vi.mock("@/hooks/use-home-projects", () => ({
  useHomeProjects: (...args: unknown[]) => useHomeProjectsMock(...args),
}));

vi.mock("@/hooks/use-projects", () => ({
  useCreateProject: () => useCreateProjectMock(),
}));

describe("HomePage", () => {
  beforeEach(() => {
    useHomeProjectsMock.mockReturnValue({
      data: {
        projects: [
          {
            id: "project-beta",
            name: "Project Beta",
            description: "Pinned project",
            updatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
            ledgerCount: 8,
            draft: { total: 10, approved: 7, percent: 70 },
            runs: { active: 1, lastStatus: "in_progress", lastCompletedAt: null },
            pinned: true,
          },
          {
            id: "project-alpha",
            name: "Project Alpha",
            description: null,
            updatedAt: new Date("2024-01-02T00:00:00Z").toISOString(),
            ledgerCount: 2,
            draft: { total: 4, approved: 1, percent: 25 },
            runs: { active: 0, lastStatus: "completed", lastCompletedAt: null },
            pinned: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    useCreateProjectMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders pinned projects ahead of others with status icons", () => {
    render(<HomePage />);

    const cards = screen.getAllByTestId("project-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-pinned", "true");
    expect(screen.getByRole("link", { name: "Project Beta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Project Alpha" })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/run in progress|idle/i)).toHaveLength(2);
  });

  it("shows empty state when no projects exist", () => {
    useHomeProjectsMock.mockReturnValueOnce({
      data: { projects: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<HomePage />);

    expect(
      screen.getByText(/No projects yet\. Create your first project/i),
    ).toBeInTheDocument();
  });

  it("records quick prompts in the recent prompts list", async () => {
    render(<HomePage />);

    const quickPromptSection = screen.getAllByTestId("quick-prompts")[0];
    const quickPromptButton = within(quickPromptSection).getByRole("button", {
      name: /Summarize what changed in my open projects this week/i,
    });
    fireEvent.click(quickPromptButton);

    const recentList = await screen.findByTestId("recent-prompts-list");
    expect(
      within(recentList).getByText(/Summarize what changed in my open projects this week/i),
    ).toBeInTheDocument();
  });
});
