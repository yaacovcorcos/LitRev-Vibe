# Ledger Inspector UX Notes

This document captures the current UX patterns for the Evidence Ledger inspector, with emphasis on locator guidance and verification safeguards.

## Locator Readiness Checklist

- Checklist items derive from `getLocatorGuidanceItems(entry)`:
  1. Pointer captured (page / paragraph / sentence).
  2. Context provided (note / quote / source field).
  3. Human verification status.
- Each item displays an icon (check or warning) alongside descriptive copy.
- When any requirement fails, the “Mark as verified” action is disabled and a toast explains what's missing.

## Toast Feedback

- Triggered via `useToast()` when the curator attempts verification without satisfying all checklist items.
- Toast contents follow the pattern: “Locator verification blocked — add a page pointer and curator note.”
- Toasts auto-dismiss after 5 seconds but remain keyboard accessible (focus management stays on the original button).

## Curator Actions

- “Return to pending” and “Mark needs review” buttons render inside the inspector when `candidateId` is present.
- Actions require a note (optional for pending, encouraged for needs review) that is persisted to the activity log payload.
- Buttons respect loading states from `useReturnLedgerEntry` and surface inline spinner feedback.

## Impact on Compose & Exports

- `entryMeetsLocatorRequirements` powers both the inspector checklist and compose/export validators.
- Compose jobs call `assertCitationsValid` prior to prompting OpenAI; missing pointer/context blocks job execution.
- Export jobs inherit the same guard via locator policy enforcement (strict by default).

## Accessibility Considerations

- Checklist uses semantic list markup (`<ul>/<li>`) to aid screen reader narration.
- Buttons maintain visible focus rings; toast announcements use `aria-live="polite"`.
- All curator inputs and buttons are reachable in a single tab order without intermediate focus traps.
