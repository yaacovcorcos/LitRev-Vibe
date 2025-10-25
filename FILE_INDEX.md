# LitRev-Vibe — File Index

Quick reference for navigating the repository. Update this index whenever new top-level directories or major modules are added.

## Root
- `README.md` — Project overview, guardrails, development commands, documentation links.
- `JOURNAL.md` — Working session log (chronological).
- `DECISIONS.md` — ADR-lite decision record.
- `CHANGELOG.md` — Milestone-level summary of changes (coming soon).
- `.gitignore` — Ignore rules (node_modules, build outputs, env files).
- `.env.example` — Environment variable template.
- `package.json` / `pnpm-lock.yaml` — Dependencies and scripts.
- `tailwind.config.ts` — Tailwind theme wired to design tokens and shadcn variables.
- `tsconfig.json` — TypeScript config with module aliases.
- `next.config.mjs` — Next.js configuration.
- `postcss.config.js` — PostCSS plugins.

## Docs
- `docs/specs/` — Product specification, homepage description, routing decisions.
- `docs/planning/` — Implementation plans (`v1`, `v2`), roadmap details.
- `docs/development/` — Testing strategy, workflows, and onboarding aids.
- `docs/development/onboarding-guide.md` — Step-by-step environment + workflow walkthrough for the Milestone 1 slice.
- `docs/development/background-jobs.md` — Queue definitions, PDF ingest flow, and compose/suggestion worker notes.
- `docs/reviews/` — QA artifacts and responsive reviews (e.g., `2025-10-15-triage-ledger-cross-device.md`).
- `docs/design/draft-workspace.md` — Draft workspace interaction patterns (editing, approvals, inspector).
- `docs/design/design-qa-checklist.md` — Visual regression and accessibility checklist for shell changes.
- `docs/design/ledger.md` — Inspector checklist UX, curator return actions, and toast behavior.
- `docs/api/ADAPTERS.md` — Adapter interfaces shared across automation subsystems.
- `docs/api/TRPC_ROUTES.md` — High-level index of tRPC procedures.
- `docs/api/search.md` — Search adapter contract, rate limits, and implementation notes for PubMed/Crossref.
- `docs/specs/triage-ledger.md` — Status lifecycle, return loop, and locator checklist specification.
- `docs/specs/compose.md` — Compose/suggestion generator prompt contracts and guardrails.
- `docs/specs/draft-versioning.md` — Snapshot storage, rollback API, and diff preview expectations.

- `app/` — Next.js App Router entry points (`layout.tsx`, `page.tsx`, global styles).
- `app/api/trpc/[trpc]/route.ts` — tRPC fetch handler exposing the application router.
- `components/layout/` — Workspace shell primitives (sidebar, header, command menu, app shell).
- `components/planning/` — Planning workspace components (section cards, editors).
- `components/planning/generated-plan-preview.tsx` — Preview panel for AI-generated plan suggestions.
- `components/activity/` — Activity & undo timeline components.
- `components/triage/` — Triage candidate cards and listing UI.
- `components/triage/candidate-card.test.tsx` — Component tests for discard/needs-review actions.
- `components/draft/` — Draft workspace components (Tiptap editor wrapper, section listing).
- `components/providers/` — Cross-cutting providers (React Query, etc.).
- `components/ui/` — shadcn/ui generated primitives (buttons, cards, textarea, etc.).
- `app/project/[id]/ledger/` — Evidence Ledger workspace surface and inspector.
- `app/api/projects/[id]/candidates/[candidateId]/needs-review/` — REST endpoint for triage status transitions with curator notes.
- `app/api/projects/[id]/ledger/[entryId]/return/` — REST endpoint returning ledger entries to triage with transactional rollback.
- `app/runs/` — Automation runs dashboard showing job progress.
- `hooks/use-candidate-rationale.ts` — React Query helpers for fetching and asking AI about a candidate.
- `hooks/use-keep-candidate.ts` — Mutation helper for enforcing locator requirement before keeping to ledger.
- `hooks/use-ledger.ts` — React Query helper for paginated ledger entries.
- `hooks/use-needs-review-candidate.ts` — Mutation hook for marking candidates as needs review with optional notes.
- `hooks/use-return-ledger-entry.ts` — Mutation hook returning ledger entries to triage with optimistic cache updates.
- `hooks/use-snippet-extraction.ts` — Mutation helper to enqueue locator snippet extraction jobs.
- `hooks/use-discard-candidate.ts` — Mutation helper for tagging candidates as discarded during triage.
- `hooks/use-exports.ts` — React Query helpers for export history, metrics, and enqueueing export jobs.
- `hooks/use-projects.ts` — tRPC-powered project CRUD hooks with optimistic mutations.
- `hooks/use-research-plan.ts` — Load, save, and generate research plan content (AI suggestions + optimistic persistence) for the Planning workspace.
- `hooks/use-compose.ts` — Helpers for enqueuing compose jobs and polling job status.
- `hooks/use-draft-sections.ts` — Fetch draft sections for the compose workspace and expose the `useUpdateDraftSection` mutation for saves/approvals.
- `hooks/use-draft-suggestions.ts` — Manage AI suggestions (list, request, resolve) for draft sections.
- `hooks/use-draft-versions.ts` — Fetch version history and trigger rollbacks for draft sections.
- `hooks/use-jobs.ts` — Fetch automation job runs with polling.
- `lib/integrity/` — Integrity feed ingestion stubs, queue jobs, scheduler helpers.
- `lib/ledger/` — Locator status helpers and related utilities.
- `lib/ledger/locator-readiness.ts` — Checklist helpers powering locator verification gating.
- `lib/compose/` — Compose workflow helpers (citation validator, job contracts, worker processor, resumable state utilities).
- `lib/compose/generator.ts` — OpenAI-backed compose document generator with fallbacks.
- `lib/compose/generator.test.ts` — Unit coverage for compose generation fallbacks and parsing.
- `lib/compose/suggestion-generator.ts` — Suggestion diff generator returning structured JSON payloads.
- `lib/compose/suggestion-generator.test.ts` — Tests for suggestion generator fallbacks and validation.
- `lib/compose/versions.ts` — Helpers for recording and rolling back draft section versions.
- `lib/storage/pdf.ts` — Candidate PDF storage resolver helpers.
- `lib/jobs/` — Job persistence helpers bridging Prisma records with queue metadata.
- `lib/design-system/` — Design tokens (`tokens.ts`), theme helpers (`theme.ts`).
- `lib/ai/` — AI orchestration helpers (OpenAI client, triage rationale jobs, Ask-AI).
- `lib/ai/plan-generator.ts` — Generates structured research plan suggestions with OpenAI fallbacks.
- `lib/planning/` — Research plan defaults, normalization, and comparison helpers.
- `lib/projects/serialize.ts` — Shared serializer normalizing project settings payloads.
- `lib/queue/` — Queue helpers (`redis.ts`, `queue.ts`, `worker.ts`).
- `lib/navigation.ts` — Navigation metadata powering the shell.
- `lib/metrics/prisma-flow.ts` — Aggregates PRISMA-style flow metrics (search totals, triage counts, ledger inclusions).
- `lib/prisma.ts` — Prisma client singleton usable across API routes and server actions.
- `lib/utils.ts` — Shared utility helpers (`cn()`).
- `lib/triage/status.ts` — Triage status enums and helpers for sanitizing state transitions.
- `lib/export/` — Export jobs, adapters, storage helpers, PRISMA diagrams, and context builders.
- `lib/export/status.ts` — Status display helpers for export lifecycle states.
- `hooks/` — React Query hooks (activity log, triage, etc.).
- `server/trpc/` — tRPC context, router definitions, and procedure composition helpers.
- `scripts/` — Runtime scripts (`run-worker.ts`).
- `stories/` — Storybook stories (design tokens, examples).
- `styles/` — Storybook-specific styles (`storybook.css`).

## Scripts & Config
- `scripts/agent-verify.sh` — Lint/test/storybook guardrail script for AI agents.
- `scripts/ingest-integrity-feeds.ts` — Placeholder ingestion runner for Retraction Watch + DOAJ feeds.

## Data
- `data/integrity/` — Sample integrity feed snapshots (Retraction Watch, DOAJ) consumed by ingestion stubs.
- `.github/workflows/ci.yml` — GitHub Actions workflow invoking agent verify.

## Data & Migrations
- `prisma/schema.prisma` — Database schema.
- `prisma/migrations/` — SQL diffs (initial migration, PDF locator snapshots).
- `prisma/seed.ts` — Seed data script.

## Logs & Builds
- `.next/` — Next.js build output (ignored).
- `node_modules/` — Dependencies (ignored).
- `dist/` — Reserved for future builds (ignored).
