import { describe, expect, it } from "vitest";

import { assertCitationsValid, validateCitations } from "./citation-validator";

const ledgerRecords = [
  { id: "entry-1", verifiedByHuman: true, locators: [{ page: 3, note: "Summary" }] },
  { id: "entry-2", verifiedByHuman: false, locators: [{ page: 5, note: "Pending" }] },
  { id: "entry-3", verifiedByHuman: true, locators: [] },
  { id: "entry-4", verifiedByHuman: true, locators: [{ note: "Missing pointer" }] },
  { id: "entry-5", verifiedByHuman: true, locators: [{ page: 10 }] },
];

describe("citation validation", () => {
  it("passes when all citations map to verified entries", () => {
    const result = validateCitations(
      [
        { id: "c1", ledgerEntryId: "entry-1" },
      ],
      ledgerRecords,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("flags missing ledger entries", () => {
    const result = validateCitations(
      [
        { id: "c1", ledgerEntryId: "missing" },
      ],
      ledgerRecords,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        code: "MISSING_LEDGER_ENTRY",
        citationId: "c1",
        ledgerEntryId: "missing",
      },
    ]);
  });

  it("flags citations without verified locators", () => {
    const result = validateCitations(
      [
        { id: "c1", ledgerEntryId: "entry-2" },
        { id: "c2", ledgerEntryId: "entry-3" },
      ],
      ledgerRecords,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        code: "UNVERIFIED_LOCATOR",
        citationId: "c1",
        ledgerEntryId: "entry-2",
      },
      {
        code: "UNVERIFIED_LOCATOR",
        citationId: "c2",
        ledgerEntryId: "entry-3",
      },
    ]);
  });

  it("flags citations lacking pointer detail", () => {
    const result = validateCitations(
      [
        { id: "c1", ledgerEntryId: "entry-4" },
      ],
      ledgerRecords,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        code: "UNVERIFIED_LOCATOR",
        citationId: "c1",
        ledgerEntryId: "entry-4",
      },
    ]);
  });

  it("flags citations lacking contextual note or quote", () => {
    const result = validateCitations(
      [
        { id: "c1", ledgerEntryId: "entry-5" },
      ],
      ledgerRecords,
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        code: "UNVERIFIED_LOCATOR",
        citationId: "c1",
        ledgerEntryId: "entry-5",
      },
    ]);
  });

  it("throws when using assert helper with invalid citations", () => {
    expect(() =>
      assertCitationsValid(
        [
          { id: "c1", ledgerEntryId: "entry-2" },
        ],
        ledgerRecords,
      ),
    ).toThrowError(/UNVERIFIED_LOCATOR:entry-2/);
  });
});
