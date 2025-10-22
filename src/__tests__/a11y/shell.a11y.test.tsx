import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axe } from "vitest-axe";
import React from "react";

import { AppShell } from "@/components/layout/app-shell";
import HomePage from "@/app/page";
import ProjectsPage from "@/app/projects/page";
import PlanningPage from "@/app/project/[id]/planning/page";
import { DEFAULT_PROJECT_SETTINGS } from "@/lib/projects/settings";

const mockUsePathname = vi.fn();
const mockUseParams = vi.fn();
const routerMocks = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
};

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useParams: () => mockUseParams(),
  useRouter: () => routerMocks,
}));

const originalFetch = global.fetch;

beforeEach(() => {
  mockUsePathname.mockReset();
  mockUseParams.mockReset();
  Object.values(routerMocks).forEach((fn) => fn.mockReset());
});

afterEach(() => {
  cleanup();
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    // @ts-expect-error - delete for test cleanup
    delete global.fetch;
  }
  vi.clearAllMocks();
});

type FetchMap = Record<string, unknown>;

function setupFetchMock(map: FetchMap) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const entry = Object.entries(map).find(([key]) => url.endsWith(key));

    if (!entry) {
      return new Response("Not Found", { status: 404 });
    }

    const [, value] = entry;
    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

function renderWithinShell(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AppShell>{ui}</AppShell>
    </QueryClientProvider>,
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

describe("Workspace shell accessibility", () => {
  test("Home route passes axe audit", async () => {
    mockUsePathname.mockReturnValue("/");

    const { container } = renderWithinShell(<HomePage />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /workspace scaffolding/i })).toBeInTheDocument(),
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("Projects route passes axe audit", async () => {
    mockUsePathname.mockReturnValue("/projects");
    mockUseParams.mockReturnValue({});
    setupFetchMock({
      "/api/projects": [sampleProject],
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
    setupFetchMock({
      "/api/projects/demo-project": sampleProject,
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
