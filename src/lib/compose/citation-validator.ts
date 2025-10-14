export type CitationReference = {
  id: string;
  ledgerEntryId: string;
};

export type LedgerCitationRecord = {
  id: string;
  verifiedByHuman: boolean;
  locators: unknown;
};

export type CitationValidationError =
  | { code: "MISSING_LEDGER_ENTRY"; citationId: string; ledgerEntryId: string }
  | { code: "UNVERIFIED_LOCATOR"; citationId: string; ledgerEntryId: string };

export type CitationValidationResult = {
  valid: boolean;
  errors: CitationValidationError[];
};

function hasVerifiedLocator(record: LedgerCitationRecord) {
  const locators = Array.isArray(record.locators) ? record.locators : [];
  return record.verifiedByHuman && locators.length > 0;
}

export function validateCitations(
  citations: CitationReference[],
  ledgerRecords: LedgerCitationRecord[],
): CitationValidationResult {
  if (citations.length === 0) {
    return { valid: true, errors: [] };
  }

  const ledgerMap = new Map(ledgerRecords.map((record) => [record.id, record]));
  const errors: CitationValidationError[] = [];

  for (const citation of citations) {
    const ledger = ledgerMap.get(citation.ledgerEntryId);

    if (!ledger) {
      errors.push({
        code: "MISSING_LEDGER_ENTRY",
        citationId: citation.id,
        ledgerEntryId: citation.ledgerEntryId,
      });
      continue;
    }

    if (!hasVerifiedLocator(ledger)) {
      errors.push({
        code: "UNVERIFIED_LOCATOR",
        citationId: citation.id,
        ledgerEntryId: ledger.id,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function assertCitationsValid(citations: CitationReference[], ledgerRecords: LedgerCitationRecord[]) {
  const result = validateCitations(citations, ledgerRecords);
  if (!result.valid) {
    const message = result.errors
      .map((error) => `${error.code}:${error.ledgerEntryId}`)
      .join(", ");
    throw new Error(`Compose blocked by citation validation errors: ${message}`);
  }
}
