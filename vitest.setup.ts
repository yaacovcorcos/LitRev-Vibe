import { expect, vi } from "vitest";

if (typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { toHaveNoViolations } = await import("vitest-axe/matchers");
  expect.extend({ toHaveNoViolations });
}

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

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
