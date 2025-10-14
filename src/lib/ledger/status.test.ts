import { describe, expect, it } from "vitest";

import { determineLocatorStatus } from "./status";

describe("determineLocatorStatus", () => {
  it("returns pending when no locators present", () => {
    expect(determineLocatorStatus({ locators: [], verifiedByHuman: false })).toBe("pending_locator");
    expect(determineLocatorStatus({ locators: undefined, verifiedByHuman: true })).toBe("pending_locator");
  });

  it("returns pending review when locators exist but not verified", () => {
    expect(determineLocatorStatus({ locators: [{}], verifiedByHuman: false })).toBe("locator_pending_review");
    expect(determineLocatorStatus({ locators: [1, 2, 3], verifiedByHuman: null })).toBe("locator_pending_review");
  });

  it("returns verified when locators exist and entry verified", () => {
    expect(determineLocatorStatus({ locators: [{}], verifiedByHuman: true })).toBe("locator_verified");
  });
});
