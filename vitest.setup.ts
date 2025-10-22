import "@testing-library/jest-dom/vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { expect, vi } from "vitest";

expect.extend(axeMatchers);

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
