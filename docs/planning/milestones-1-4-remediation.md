# Milestones 1–4 Remediation Plan

Detailed backlog of fixes and enhancements needed to close the remaining gaps for milestones 1 through 4. Each task explicitly calls out code, validation, and documentation follow-ups. Track items with the provided checkboxes; when all tasks are complete, remove this document (see final task).

---

## Milestone 1 — Core Shell & Plan Data

- [ ] **Restore project-aware navigation paths**
  - Implementation: Update `src/components/layout/sidebar.tsx` and `src/lib/navigation.ts` so project routes resolve with the active project ID (leveraging routing helpers similar to `CommandMenu`).
  - Validation: Manually verify navigation from `/projects` into project sub-pages and add regression coverage in a React component test if feasible.
  - Documentation: Record the routing fix in `DECISIONS.md` and note the navigation behaviour in `docs/planning/litrev-mvp-implementation-plan-v2.md`.

- [ ] **Provide a functional Notifications workspace route**
  - Implementation: Either wire up the planned notifications page under `src/app/notifications/page.tsx` or temporarily remove the navigation item until the surface exists (update `workspaceNav` accordingly).
  - Validation: Confirm no navigation entry leads to a 404 in the App Router.
  - Documentation: Update `ARCHITECTURE.md` (UI surfaces section) with the chosen approach and log the interim decision in `DECISIONS.md`.

- [ ] **Expand README/Onboarding for milestone-ready flows**
  - Implementation: Extend `README.md` (and/or `docs/development/`) with current instructions for planning → triage → ledger flows that were stabilized in Milestone 1.
  - Validation: Peer review the updated instructions to ensure a fresh install can follow them end-to-end.
  - Documentation: This task *is* documentation focused; capture any open questions in `JOURNAL.md`.

---

## Milestone 2 — Search Stack

- [x] **Complete the Crossref search adapter**
  - Implementation: `src/lib/search/adapters/crossref.ts` now queries Crossref’s `/works` endpoint with rate limiting, paging, filter support, and normalized metadata output.
  - Validation: Added `src/lib/search/adapters/crossref.test.ts` with mocked responses plus full `pnpm test` run.
  - Documentation: Added `docs/api/search.md` outlining adapter coverage and Crossref-specific requirements.

- [ ] **Support multi-adapter execution from the triage UI**
  - Implementation: Allow adapter selection in `src/app/project/[id]/triage/page.tsx` (persist choice per project), pass selected adapters through `useEnqueueSearch` to `enqueueSearchJob`.
  - Validation: Add a component test to ensure chosen adapters propagate, and confirm search jobs capture the adapter list in job logs.
  - Documentation: Extend the planning document with the adapter-selection UX, and document the API contract in `docs/api/search.md`.

- [ ] **Implement PDF/object storage ingestion pipeline**
  - Implementation: Introduce background processing (likely in `lib/search/jobs.ts` or a dedicated worker) to fetch PDFs (when available), store them via `src/lib/export/storage.ts`-style helpers, and persist locator-friendly snippets.
  - Validation: Add integration tests ensuring candidates with PDFs store file metadata and that `fetchUnpaywallBatch` results trigger downloads when possible.
  - Documentation: Update `ARCHITECTURE.md` (Data pipelines) and add operational guidance to `docs/development/background-jobs.md` (create if missing).

---

## Milestone 3 — Triage & Ledger

- [ ] **Expose discard / needs-review actions in triage UI**
  - Implementation: Extend `CandidateCard` with discard + flag-for-review controls that call `useDiscardCandidate()` / future status mutations; reflect status changes in UI badges.
  - Validation: Add component tests covering status transitions and verify activity log entries (`triage.discarded`, etc.) appear.
  - Documentation: Update the triage UX section in `docs/planning/litrev-mvp-implementation-plan-v2.md` and add rationale to `DECISIONS.md`.

- [ ] **Allow curator review loops before ledger admission**
  - Implementation: Add a “send back to pending/needs_review” pathway and surface integrity flags prominently in the inspector (`src/app/project/[id]/ledger/page.tsx`).
  - Validation: Write unit tests for the new status mutation and manually verify the workflow in the UI.
  - Documentation: Document the state machine in `docs/specs/triage-ledger.md`.

- [ ] **Automate locator verification guidance**
  - Implementation: Provide inline prompts/checklists in the ledger inspector and wire up toast/notification feedback when locators are incomplete.
  - Validation: Ensure compose/export jobs remain blocked when locator requirements fail (use existing citation validator tests).
  - Documentation: Update `ARCHITECTURE.md` (Integrity safeguards) and note UX guidance in `docs/design/ledger.md`.

---

## Milestone 4 — Draft & Compose

- [ ] **Replace compose stub content with model-generated prose**
  - Implementation: Integrate OpenAI (or adapter pattern) inside `src/lib/compose/processor.ts` to generate paragraphs using verified ledger entries and research question context.
  - Validation: Extend `processor.test.ts` with mocks ensuring citation validation still gates output; run end-to-end compose Playwright test.
  - Documentation: Document prompt strategy and fallback behaviour in `docs/specs/compose.md`.

- [ ] **Implement genuine AI suggestions with diff previews**
  - Implementation: Update `createDraftSuggestion` to call the AI provider instead of deterministic text, capturing before/after diff payloads.
  - Validation: Add unit tests to cover accepted/dismissed suggestion flows and ensure activity logging works.
  - Documentation: Update `docs/design/draft.md` describing suggestion UX and the non-destructive review pattern.

- [ ] **Enhance versioning & rollback observability**
  - Implementation: Surface diff previews for prior versions in `DraftPage`, and ensure `recordDraftSectionVersion` captures locator links.
  - Validation: Add integration tests for rollback operations via `useRollbackDraftVersion`.
  - Documentation: Expand `docs/specs/draft-versioning.md` with the revised behaviour.

---

## Final Task

- [ ] **Remove this remediation document when all items are complete**
  - Implementation: Delete `docs/planning/milestones-1-4-remediation.md`.
  - Validation: Confirm all tasks are closed in tracking system before removal.
  - Documentation: Note the document removal in the release journal (`JOURNAL.md`) for audit purposes.
