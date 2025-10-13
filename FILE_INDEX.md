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
- `components/ui/` — shadcn/ui generated primitives (e.g., `button.tsx`).
- `lib/design-system/` — Design tokens (`tokens.ts`), theme helpers (`theme.ts`).
- `lib/queue/` — Queue helpers (`redis.ts`, `queue.ts`, `worker.ts`).
- `lib/utils.ts` — Shared utility helpers (`cn()`).
- `scripts/` — Runtime scripts (`run-worker.ts`).
- `stories/` — Storybook stories (design tokens, examples).
- `styles/` — Storybook-specific styles (`storybook.css`).

## Scripts & Config
- `scripts/agent-verify.sh` — Lint/test/storybook guardrail script for AI agents.
- `.github/workflows/ci.yml` — GitHub Actions workflow invoking agent verify.

## Data & Migrations
- `prisma/schema.prisma` — Database schema.
- `prisma/migrations/` — SQL diffs (initial migration).
- `prisma/seed.ts` — Seed data script.

## Logs & Builds
- `.next/` — Next.js build output (ignored).
- `node_modules/` — Dependencies (ignored).
- `dist/` — Reserved for future builds (ignored).
