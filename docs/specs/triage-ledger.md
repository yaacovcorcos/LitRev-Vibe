# Triage ↔ Ledger Workflow

This specification explains how candidates progress from the triage workspace into the evidence ledger and back again when curators request additional review.

## Candidate Status Lifecycle

| Status        | Surface                    | Description |
|---------------|---------------------------|-------------|
| `pending`     | Triage queue               | Newly fetched or returned candidates awaiting curator decision. |
| `kept`        | Ledger (active record)     | Candidate promoted to ledger after locator requirements met. |
| `needs_review`| Triage queue + badge       | Candidate flagged for follow-up by triage reviewers; notes captured for curator context. |
| `discarded`   | Activity log only          | Candidate intentionally dropped; retained for auditing. |

- The triage UI surfaces “Keep to ledger”, “Needs review”, and “Discard” actions via `CandidateCard`.
- `needs_review` requires an optional note; both actions emit `triage.needs_review` or `triage.discarded` activity records.

## Ledger Return Loop

- The ledger inspector exposes “Return to pending” and “Mark needs review” controls when an entry originated from a triage candidate.
- POST `/api/projects/:id/ledger/:entryId/return` performs a transaction that:
  1. Deletes the ledger entry.
  2. Restores or creates the matching candidate with updated status (`pending` or `needs_review`).
  3. Logs both `ledger.returned` and `triage.returned` activities with curator notes.
- UI components optimistically update React Query caches (`useReturnLedgerEntry`).

## Locator Checklist & Blocking Behavior

- The inspector renders a readiness checklist derived from `entryMeetsLocatorRequirements`:
  - Pointer present (page/paragraph/sentence).
  - Context captured (note/quote/source field).
  - Verified by human curator.
- “Mark as verified” remains disabled until all requirements pass; attempting verification without completeness triggers a toast with missing fields.

## Activity & Telemetry

- Every status transition records structured payloads via `logActivity`, ensuring auditing across the triage/ledger boundary.
- Search job telemetry persists the adapter list so ledger provenance identifies the originating source even after returns.

## Open Questions

- Do we persist curator notes when an entry is kept after a return (for historical context)?
- Should discarded candidates be purged after a retention window, or kept indefinitely for reproducibility?
