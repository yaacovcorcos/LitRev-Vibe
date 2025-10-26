import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import React from "react";

import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import HomePage from "@/app/page";
import ProjectsPage from "@/app/projects/page";
import PlanningPage from "@/app/project/[id]/planning/page";
import { EMPTY_PLAN_RESPONSE } from "@/lib/planning/plan";
import { DEFAULT_PROJECT_SETTINGS } from "@/lib/projects/settings";

const mockUsePathname = vi.fn();
const mockUseParams = vi.fn();
const routerMocks = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
};

const projectHookMocks = vi.hoisted(() => ({
  useProjects: vi.fn(),
  useProject: vi.fn(),
  useCreateProject: vi.fn(),
  useUpdateProject: vi.fn(),
  useDeleteProject: vi.fn(),
}));

const planHookMocks = vi.hoisted(() => ({
  useResearchPlan: vi.fn(),
  useSaveResearchPlan: vi.fn(),
  useGenerateResearchPlan: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useParams: () => mockUseParams(),
  useRouter: () => routerMocks,
}));

vi.mock("@/hooks/use-projects", () => ({
  useProjects: () => projectHookMocks.useProjects(),
  useProject: (...args: Parameters<typeof projectHookMocks.useProject>) =>
    projectHookMocks.useProject(...args),
  useCreateProject: () => projectHookMocks.useCreateProject(),
  useUpdateProject: () => projectHookMocks.useUpdateProject(),
  useDeleteProject: () => projectHookMocks.useDeleteProject(),
}));

vi.mock("@/hooks/use-research-plan", () => ({
  useResearchPlan: (...args: Parameters<typeof planHookMocks.useResearchPlan>) =>
    planHookMocks.useResearchPlan(...args),
  useSaveResearchPlan: () => planHookMocks.useSaveResearchPlan(),
  useGenerateResearchPlan: () => planHookMocks.useGenerateResearchPlan(),
}));

beforeEach(() => {
  mockUsePathname.mockReset();
  mockUseParams.mockReset();
  Object.values(routerMocks).forEach((fn) => fn.mockReset());
  Object.values(projectHookMocks).forEach((fn) => fn.mockReset());
  Object.values(planHookMocks).forEach((fn) => fn.mockReset());

  projectHookMocks.useProjects.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  projectHookMocks.useProject.mockReturnValue({
    data: null,
    isLoading: false,
  });
  projectHookMocks.useCreateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
  projectHookMocks.useUpdateProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
  projectHookMocks.useDeleteProject.mockReturnValue({ mutate: vi.fn(), isPending: false });
  planHookMocks.useSaveResearchPlan.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  });
  planHookMocks.useGenerateResearchPlan.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    status: "idle",
    data: null,
  });
  planHookMocks.useResearchPlan.mockReturnValue({
    data: null,
    isLoading: false,
    isFetching: false,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWithinShell(ui: React.ReactElement) {
  return render(
    <QueryProvider>
      <AppShell>{ui}</AppShell>
    </QueryProvider>,
  );
}

const sampleProject = {
  id: "demo-project",
  name: "Demo Medical Review",
  description: "Seed project for accessibility tests.",
  settings: DEFAULT_PROJECT_SETTINGS,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const samplePlan = {
  ...EMPTY_PLAN_RESPONSE,
  id: "plan-demo",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("Workspace shell accessibility", () => {
  test("Home route passes axe audit", async () => {
    mockUsePathname.mockReturnValue("/");

    const { container } = renderWithinShell(<HomePage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /global workspace/i })).toBeInTheDocument(),
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("Projects route passes axe audit", async () => {
    mockUsePathname.mockReturnValue("/projects");
    mockUseParams.mockReturnValue({});
    projectHookMocks.useProjects.mockReturnValue({
      data: [sampleProject],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const { container } = renderWithinShell(<ProjectsPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /projects/i })).toBeInTheDocument(),
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("Planning route passes axe audit", async () => {
    mockUsePathname.mockReturnValue("/project/demo-project/planning");
    mockUseParams.mockReturnValue({ id: "demo-project" });
    projectHookMocks.useProject.mockReturnValue({
      data: sampleProject,
      isLoading: false,
    });
    planHookMocks.useResearchPlan.mockReturnValue({
      data: samplePlan,
      isLoading: false,
      isFetching: false,
    });

    const { container } = renderWithinShell(<PlanningPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /planning workspace/i }),
      ).toBeInTheDocument(),
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
