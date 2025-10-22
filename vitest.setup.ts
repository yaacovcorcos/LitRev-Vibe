import { expect, vi } from "vitest";

async function setupDomMatchers() {
  if (typeof document === "undefined") {
    return;
  }

  await import("@testing-library/jest-dom/vitest");
  const matchers = await import("vitest-axe/matchers");
  expect.extend(matchers);
}

void setupDomMatchers();

if (!("ResizeObserver" in globalThis)) {
  class ResizeObserverMock {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  }
  // @ts-expect-error - assign test shim
  globalThis.ResizeObserver = ResizeObserverMock;
}

if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = vi.fn();
}
