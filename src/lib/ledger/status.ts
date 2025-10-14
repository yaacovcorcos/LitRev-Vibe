export type LocatorStatus = "pending_locator" | "locator_pending_review" | "locator_verified";

export type LocatorStatusTone = "danger" | "warning" | "success";

export type LocatorStatusDisplay = {
  label: string;
  badgeVariant: "default" | "outline";
  tone: LocatorStatusTone;
  inspectorTitle: string;
  inspectorBody: string;
};

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

const DISPLAY_MAP: Record<LocatorStatus, LocatorStatusDisplay> = {
  pending_locator: {
    label: "Pending locator",
    badgeVariant: "outline",
    tone: "danger",
    inspectorTitle: "Pending locator",
    inspectorBody: "Add at least one locator before this reference can be used for compose or export workflows.",
  },
  locator_pending_review: {
    label: "Review",
    badgeVariant: "outline",
    tone: "warning",
    inspectorTitle: "Locator captured",
    inspectorBody: "Double-check locator accuracy before marking this reference as verified.",
  },
  locator_verified: {
    label: "Verified",
    badgeVariant: "default",
    tone: "success",
    inspectorTitle: "Locator verified",
    inspectorBody: "Ready for compose, export, and citation validation flows.",
  },
};

export function getLocatorStatusDisplay(status: LocatorStatus): LocatorStatusDisplay {
  return DISPLAY_MAP[status] ?? DISPLAY_MAP.pending_locator;
}
