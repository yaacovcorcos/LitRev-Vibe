import { describe, expect, it } from "vitest";

import { determineLocatorStatus } from "./status";

describe("determineLocatorStatus", () => {
  it("returns pending when no locators", () => {
    expect(determineLocatorStatus({ locators: [], verifiedByHuman: false })).toBe("pending_locator");
    expect(determineLocatorStatus({ locators: undefined, verifiedByHuman: true })).toBe("pending_locator");
  });

  it("returns pending review when locators captured but not verified", () => {
    expect(determineLocatorStatus({ locators: [{}], verifiedByHuman: false })).toBe("locator_pending_review");
    expect(determineLocatorStatus({ locators: [{}], verifiedByHuman: null })).toBe("locator_pending_review");
  });

  it("returns verified when locators captured and verified", () => {
    expect(determineLocatorStatus({ locators: [{}], verifiedByHuman: true })).toBe("locator_verified");
  });
});
