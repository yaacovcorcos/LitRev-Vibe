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
- (future) `docs/api/` — tRPC routes, adapter contracts.
- (future) `docs/development/` — testing strategy, workflows.

## Source (`src/`)
- `app/` — Next.js App Router entry points (`layout.tsx`, `page.tsx`, global styles).
- `components/layout/` — Workspace shell primitives (sidebar, header, command menu, app shell).
- `components/planning/` — Planning workspace components (section cards, editors).
- `components/activity/` — Activity & undo timeline components.
- `components/triage/` — Triage candidate cards and listing UI.
- `components/providers/` — Cross-cutting providers (React Query, etc.).
- `components/ui/` — shadcn/ui generated primitives (buttons, cards, textarea, etc.).
- `app/project/[id]/ledger/` — Evidence Ledger workspace surface and inspector.
- `hooks/use-candidate-rationale.ts` — React Query helpers for fetching and asking AI about a candidate.
- `hooks/use-keep-candidate.ts` — Mutation helper for enforcing locator requirement before keeping to ledger.
- `hooks/use-ledger.ts` — React Query helper for paginated ledger entries.
- `hooks/use-snippet-extraction.ts` — Mutation helper to enqueue locator snippet extraction jobs.
- `lib/integrity/` — Integrity feed ingestion stubs, queue jobs, scheduler helpers.
- `lib/ledger/` — Locator status helpers and related utilities.
- `lib/compose/` — Compose workflow helpers (citation validator, etc.).
- `lib/design-system/` — Design tokens (`tokens.ts`), theme helpers (`theme.ts`).
- `lib/ai/` — AI orchestration helpers (OpenAI client, triage rationale jobs, Ask-AI).
- `lib/queue/` — Queue helpers (`redis.ts`, `queue.ts`, `worker.ts`).
- `lib/navigation.ts` — Navigation metadata powering the shell.
- `lib/prisma.ts` — Prisma client singleton usable across API routes and server actions.
- `lib/utils.ts` — Shared utility helpers (`cn()`).
- `hooks/` — React Query hooks (projects CRUD, activity log, etc.).
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
- `prisma/migrations/` — SQL diffs (initial migration).
- `prisma/seed.ts` — Seed data script.

## Logs & Builds
- `.next/` — Next.js build output (ignored).
- `node_modules/` — Dependencies (ignored).
- `dist/` — Reserved for future builds (ignored).
