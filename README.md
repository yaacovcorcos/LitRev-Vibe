# LitRev-Vibe

An AI-assisted medical literature review and authoring workspace. The MVP is being built as a single-user “Parent” release with automation guardrails designed for autonomous coding agents.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom tokens
- **Component Library:** shadcn/ui (New York style)
- **State/Queues:** BullMQ + Redis
- **Database ORM:** Prisma (PostgreSQL)
- **API Transport:** tRPC 11 (React Query client) with superjson
- **Testing/Stories:** Vitest, Playwright (workflow + visual snapshots), Storybook (smoke tests)
- **Tooling:** pnpm, ESLint, PostCSS

## Project Structure

- `docs/` — Product specs, planning docs, future API / architecture references.
- `src/` — Application source (App Router, design system, queue helpers, stories).
- `scripts/` — Automation and worker scripts.
- `prisma/` — Schema, migrations, seed.
- `.github/` — CI workflows.
- `JOURNAL.md`, `DECISIONS.md`, `FILE_INDEX.md`, `CHANGELOG.md` — Governance docs.

## Agent Verification Workflow

Before opening a pull request or deploying, run the verification script:

```bash
./scripts/agent-verify.sh
```

The script:

- Executes `pnpm`-based checks when a `package.json` is present (`format:check`, `lint`, `test`, `storybook:test`).
- Skips gracefully when the Node workspace has not been bootstrapped yet.
- Fails fast if required tooling (Node.js, pnpm) is missing.

In CI, the same script runs via [`.github/workflows/ci.yml`](.github/workflows/ci.yml) to keep local and remote guardrails aligned.

## Design System Tokens

- Shared tokens live in [`src/lib/design-system/tokens.ts`](src/lib/design-system/tokens.ts).
- Tailwind consumes the tokens via [`tailwind.config.ts`](tailwind.config.ts).
- Additional theme helpers (e.g., for shadcn/ui) are exported from [`src/lib/design-system/theme.ts`](src/lib/design-system/theme.ts).
- Components should import tokens/aliases directly instead of hardcoding colors or spacing to keep future Descendant upgrades painless.

## Environment Variables

1. Duplicate the example file: `cp .env.example .env`.
2. Fill in provider credentials as they become available:
   - `DATABASE_URL`, `REDIS_URL`, `STORAGE_BUCKET_URL`
   - AI keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
   - External APIs such as `UNPAYWALL_EMAIL`, `NCBI_API_KEY`, `RETRACTION_WATCH_API_KEY`
   - Telemetry settings (`SENTRY_DSN`, `PLAUSIBLE_API_KEY`)
3. Never commit populated `.env` files. The CI workflow automatically copies `.env.example` for verification runs.

## Queue Worker (BullMQ)

- Ensure `REDIS_URL` points to a reachable Redis instance.
- Run the worker locally: `pnpm run worker` (adds a sample heartbeat job so you can confirm connectivity).
- For CI or smoke checks: `pnpm run queue:smoke` (uses the same worker script).

## Storybook & Design QA

- Launch Storybook locally: `pnpm run storybook`.
- Smoke test in CI/local: `pnpm run storybook:test` (uses `--ci --smoke-test`).
- Build static bundle: `pnpm run storybook:build`.
- Optional Chromatic run: export `CHROMATIC_PROJECT_TOKEN` then `pnpm run chromatic` (skips automatically if the token is missing).
- Baseline design docs live in `src/stories/DesignTokens.stories.tsx` and share tokens with the application code.
- Visual baselines for the app shell live in Playwright (`playwright/design-qa.spec.ts`). Run `pnpm exec playwright test --grep @visual` to compare against snapshots, or `pnpm exec playwright test --grep @visual --update-snapshots` after intentional UI changes.
- The full checklist for visual + accessibility sign-off is documented in [`docs/design/design-qa-checklist.md`](docs/design/design-qa-checklist.md).

## Getting Started

1. Install dependencies: `pnpm install`
2. Copy env template: `cp .env.example .env` (fill values as needed)
3. Run dev server: `pnpm run dev`
4. Run Storybook: `pnpm run storybook` (optional)
5. Run Playwright checks (optional): `pnpm run playwright:test` *(uses mock Redis in test harness; add `--grep @visual` to include design QA snapshots)*

## Milestone 1 Guided Flow (Planning → Triage → Ledger)

Walk the current MVP slice end-to-end with the seeded tooling:

1. **Create a project**  
   - Navigate to `/projects` and use the “New Project” card.  
   - tRPC-powered CRUD records the project and emits activity log entries for auditability.

2. **Author the research plan**  
   - Visit `/project/{id}/planning`.  
   - Edit scope, questions, query strategy, and outline, then click “Save draft” to persist to the `ResearchPlan` record.  
   - The “Generate with AI” button calls the OpenAI-backed plan generator (requires `OPENAI_API_KEY`) and lets you apply the suggestion into the editable form before saving.

3. **Search and triage candidates**  
   - Open `/project/{id}/triage`.  
   - Enter Boolean terms and submit to enqueue a search job (Redis must be available for background workers).  
   - Review candidates, inspect integrity flags, use Ask-AI, and “Keep to ledger” only after providing locator details—enforcing the “no claim without a locator” rule.

4. **Review evidence in the ledger**  
   - Head to `/project/{id}/ledger` to inspect kept references, provenance, integrity notes, and locator coverage.  
   - Add supplemental locators or mark entries as verified; locator status badges feed compose/export validation in later milestones.

5. **Monitor automation surfaces**  
   - `/runs` tracks job progress for search, triage rationale, and compose tasks.  
   - `/project/{id}/activity` lists every action for reproducibility.  
   - `/notifications` currently hosts a placeholder describing the upcoming alert centre and links back to Runs while notification feeds are in development.

Environment setup tips (Redis, Postgres, OpenAI, Unpaywall) and manual test data seeding notes live in the [development onboarding guide](docs/development/onboarding-guide.md).

## Application Development

- Start the Next.js dev server: `pnpm run dev`.
- Build for production: `pnpm run build`.
- Run production server locally: `pnpm run start`.
- Lint with Next.js rules: `pnpm run lint`.

## UI Component Library

- shadcn/ui is initialized via `components.json`; generated components live under `src/components/ui`.
- Add new primitives with `pnpm dlx shadcn@latest add <component>` (they consume shared design tokens automatically).
- Utility helpers live in `src/lib/utils.ts`, exposing `cn()` for class merging.
- Tailwind tokens integrate with CSS variables in `src/app/globals.css` and `tailwind.config.ts`.

## Next Steps

- Review Milestone plans in `docs/planning/litrev-mvp-implementation-plan-v2.md` for remaining feature work.
- Before merging UI changes, walk through the Design QA checklist and update Playwright baselines when necessary.
