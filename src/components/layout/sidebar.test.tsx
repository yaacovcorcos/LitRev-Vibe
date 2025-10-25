import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { Sidebar } from "@/components/layout/sidebar";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string }>) => (
    <a href={href ?? ""} {...props}>
      {children}
    </a>
  ),
}));

describe("Sidebar project-aware navigation", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders project scoped links when project context is present", () => {
    mockUsePathname.mockReturnValue("/project/demo-project/planning");

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /planning/i })).toHaveAttribute(
      "href",
      "/project/demo-project/planning",
    );
    expect(screen.getByRole("link", { name: /draft & compose/i })).toHaveAttribute(
      "href",
      "/project/demo-project/draft",
    );
    expect(screen.getByRole("link", { name: /export/i })).toHaveAttribute(
      "href",
      "/project/demo-project/export",
    );
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/project/demo-project/settings",
    );
  });

  test("disables project links when no project is active", () => {
    mockUsePathname.mockReturnValue("/projects");

    render(<Sidebar />);

    expect(screen.getByRole("button", { name: /planning/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /draft & compose/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /settings/i })).toBeDisabled();
  });
});
