# Draft Versioning & Rollback

## Snapshot Storage

- `DraftSectionVersion` rows persist `content`, `status`, `version`, and `locators` (array of primary locator summaries captured at compose or suggest time).
- `recordDraftSectionVersion` is the single entry point; always provide locator data when available (compose and suggestion acceptance do).
- Snapshots are created when:
  - Draft sections are first materialised.
  - Compose job completes successfully.
  - AI suggestion is accepted.
  - Manual save increments the version counter.
  - Rollback promotes an older snapshot (new snapshot created post-rollback).

## Rollback UX

- Version list displays newest first with timestamp, status badge, and diff summary.
- Diff summary is derived from sentence comparison between the selected snapshot and the more recent content:
  - “Will remove” — sentences present today but not in the selected version.
  - “Restored” — sentences reintroduced by the snapshot.
- Locator summary highlights the primary pointer/citation stored in the snapshot to help reviewers anticipate context shifts.
- Quick-restore button defaults to the most recent prior snapshot (`data-target-version` attribute used in tests).

## API Contract

- `GET /api/projects/:id/draft/:sectionId/versions` now returns `content` + `locators` for each snapshot (trusted for UI diff generation only; never mutate).
- `POST /api/projects/:id/draft/:sectionId/versions` rolls the draft forward to a historic snapshot and records a new snapshot with inherited locator data.

## Guardrails

- Rollback operations must remain idempotent; the transaction locks the section, applies content, increments version, and snapshot persists the new state.
- Tests live in `src/app/project/[id]/draft/page.test.tsx` for UI behavior and `src/app/api/projects/[id]/draft/[sectionId]/versions/route.test.ts` for API contract.
- When adding new metadata to snapshots, expose it via the versions API and extend diff preview rendering + tests accordingly.
