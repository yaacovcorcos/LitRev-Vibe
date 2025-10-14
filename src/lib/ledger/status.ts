export type LocatorStatus = "pending_locator" | "locator_pending_review" | "locator_verified";

export function determineLocatorStatus({
  locators,
  verifiedByHuman,
}: {
  locators?: unknown;
  verifiedByHuman?: boolean | null;
}): LocatorStatus {
  const locatorArray = Array.isArray(locators) ? locators : [];
  const hasLocators = locatorArray.length > 0;

  if (!hasLocators) {
    return "pending_locator";
  }

  if (verifiedByHuman) {
    return "locator_verified";
  }

  return "locator_pending_review";
}
