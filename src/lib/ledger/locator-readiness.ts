type LocatorRecord = Record<string, unknown>;

function asLocatorArray(value: unknown): LocatorRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is LocatorRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item));
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function locatorHasPointer(locator: LocatorRecord): boolean {
  return ["page", "paragraph", "sentence"].some((key) => isPositiveInteger(locator[key]));
}

function locatorHasContext(locator: LocatorRecord): boolean {
  const note = typeof locator.note === "string" ? locator.note.trim() : "";
  const quote = typeof locator.quote === "string" ? locator.quote.trim() : "";
  const source = typeof locator.source === "string" ? locator.source.trim() : "";

  return Boolean(note || quote || source);
}

export type LocatorReadiness = {
  hasLocator: boolean;
  hasPointer: boolean;
  hasContext: boolean;
  verifiedByHuman: boolean;
};

export function evaluateLocatorReadiness({
  locators,
  verifiedByHuman,
}: {
  locators: unknown;
  verifiedByHuman?: boolean | null;
}): LocatorReadiness {
  const locatorArray = asLocatorArray(locators);
  const hasLocator = locatorArray.length > 0;
  const hasPointer = locatorArray.some(locatorHasPointer);
  const hasContext = locatorArray.some(locatorHasContext);

  return {
    hasLocator,
    hasPointer,
    hasContext,
    verifiedByHuman: Boolean(verifiedByHuman),
  };
}

export function entryMeetsLocatorRequirements({ locators, verifiedByHuman }: { locators: unknown; verifiedByHuman?: boolean | null }): boolean {
  const readiness = evaluateLocatorReadiness({ locators, verifiedByHuman });
  return readiness.hasLocator && readiness.hasPointer && readiness.hasContext && readiness.verifiedByHuman;
}

export type LocatorGuidanceItem = {
  id: string;
  label: string;
  description: string;
  satisfied: boolean;
};

export function getLocatorGuidanceItems(readiness: LocatorReadiness): LocatorGuidanceItem[] {
  return [
    {
      id: "locator",
      label: "At least one locator captured",
      description: "Provide locator details when keeping the candidate in triage.",
      satisfied: readiness.hasLocator,
    },
    {
      id: "pointer",
      label: "Includes a page, paragraph, or sentence number",
      description: "Add a precise pointer so reviewers can quickly find the evidence.",
      satisfied: readiness.hasPointer,
    },
    {
      id: "context",
      label: "Includes reviewer context (note, quote, or source)",
      description: "Summarize the snippet, paste the quote, or list the source details.",
      satisfied: readiness.hasContext,
    },
    {
      id: "verified",
      label: "Marked as human verified",
      description: "Confirm the locator is accurate before compose/export workflows.",
      satisfied: readiness.verifiedByHuman,
    },
  ];
}

export function missingLocatorRequirementsMessage(readiness: LocatorReadiness): string {
  const unmet = getLocatorGuidanceItems(readiness)
    .filter((item) => !item.satisfied)
    .map((item) => item.label.toLowerCase());

  if (unmet.length === 0) {
    return "";
  }

  return `Complete locator requirements before verifying: ${unmet.join(", ")}.`;
}

export function missingPrerequisitesForVerification(readiness: LocatorReadiness): string | null {
  const unmet = getLocatorGuidanceItems(readiness)
    .filter((item) => item.id !== "verified" && !item.satisfied)
    .map((item) => item.label.toLowerCase());

  if (unmet.length === 0) {
    return null;
  }

  return `Add locator details before verifying: ${unmet.join(", ")}.`;
}

export function locatorHasRequiredDetails(locator: unknown): boolean {
  if (!locator || typeof locator !== "object" || Array.isArray(locator)) {
    return false;
  }

  const record = locator as LocatorRecord;
  return locatorHasPointer(record) && locatorHasContext(record);
}

export { asLocatorArray };
