# LitRev-Vibe — Working Journal

Track meaningful progress, context, and intent for every substantial change. Each entry should mention only the new work from that session; link to related docs or files where helpful.

## Entries

### 2025-10-15 — Cross-Device Triage & Ledger Review
- Ran responsive pass for Search & Triage plus Evidence Ledger across 390–1440px viewports; logged findings in `docs/reviews/2025-10-15-triage-ledger-cross-device.md`.
- Tweaked triage search form padding (`p-4 sm:p-6`) so mobile widths retain comfortable spacing without crowding controls.
- Confirmed LocatorBanner component keeps inspector messaging legible on tablet and phone breakpoints; no additional layout changes required.

### 2025-10-15 — Citation Validator Sign-off
- Audited `src/lib/compose/citation-validator.ts` to confirm ledger-only enforcement and verified locator checks.
- Documented milestone acceptance in `docs/planning/litrev-mvp-implementation-plan-v2.md` and pointed to Vitest coverage (`citation-validator.test.ts`).
- Ready to wire `assertCitationsValid` into the compose worker pipeline once the job scaffold lands.

### 2025-10-15 — Locator Workflow Hardening
- Added unit tests for ledger locator POST route covering validation, append behaviour, and verification reset to pending review.
- Added unit tests for ledger verification route ensuring payload validation and status updates.
- Confirmed vitest suite passes and marked Milestone 3 backlog item for manual locator UX as complete.
- Extracted locator status banner UI into shared component and wired Storybook scenarios for ledger page + inspector to support design sign-off.

### 2025-10-14 — Evidence Ledger Skeleton
- Implemented paginated ledger API route and React Query hook.
- Delivered `/project/:id/ledger` workspace with entry list + inspector placeholder for metadata, locators, and provenance.
- Documented new module in architecture/file index and surfaced milestone progress in changelog.
- Added manual locator entry workflow with API endpoint + inspector form; basic validation wired for future verification.
- Highlighted locator verification status in the workspace and warned users when entries lack coverage.
- Required locators during triage keep flows (API + UI) to uphold “no locator, no ledger” policy.
- Filtered triage queue to pending entries so kept references move directly into the Evidence Ledger.
- Captured locator quotes + sources in both keep flow and inspector to preserve provenance context.
- Logged activity entries when candidates are kept, providing immediate audit feedback.
- Introduced locator status helper (pending/review/verified) with UI badges and unit coverage.
- Added citation validator module enforcing ledger-only, verified locators with Vitest coverage.
- Wired triage rationale + Ask-AI flows to OpenAI (with graceful fallbacks when API unavailable).
- Added abstract-based quote fallback so Ask-AI still surfaces snippets before PDF ingestion lands.
- Wired integrity feed ingestion stubs (Retraction Watch + DOAJ) that flag matching candidates.
- Added manual locator verification toggle (pending → review → verified) in ledger UI.
- Created triage rationale batch job (OpenAI) with queue retries + metrics schema.
- Updated Ask-AI prompts to prioritize stored locator snippets (PDF fallback) before abstract quotes.
- Captured locator summary Storybook coverage for responsive QA.
- Added triage "Refresh snippets" action to enqueue PDF snippet extraction per candidate.
- Added queue job + cron hook stub for nightly integrity feed ingestion.
- Wired worker scheduler to enqueue nightly integrity ingestion and added tests.
- Surfaced integrity flags on triage cards with severity messaging + tooltip for quick review.
- Finalized locator status display helpers and ensured tests cover pending → review → verified transitions.

### 2025-10-14 — Triage AI Scaffolding
- Added cached triage rationale endpoint with Prisma persistence and rate-limited stub generator.
- Built React Query hooks + UI wiring for Ask-AI interactions on candidate cards (quotes + error states).
- Updated architecture/file index docs to cover the new AI layer; noted work-in-progress in changelog.

### 2025-10-13 — Foundation Setup
- Added core repository scaffolding: design tokens, Tailwind theme, Storybook, Prisma schema, BullMQ worker, Next.js app shell, and shadcn/ui integration.
- Established guardrails: `scripts/agent-verify.sh`, `.env.example`, GitHub CI workflow, documentation updates in README.
- Organized specs and planning docs under `docs/specs/` and `docs/planning/`.
- Outcome: Milestone 0 complete; project ready for Milestone 1 (app shell, planning UX).

### 2025-10-13 — Workspace Shell Integration
- Created layout components (`Sidebar`, `Header`, `CommandMenu`, `AppShell`) and navigation metadata.
- Wrapped the Next.js App Router layout with `AppShell`; refreshed the home page content to fit the new shell container.
- Result: Baseline global frame (sidebar/header) ready for Milestone 1 routes and interactions.
### 2025-10-13 — Project CRUD API & Hooks
- Added Prisma-backed REST routes for `/api/projects` (list/create/update/delete).
- Introduced React Query provider and hooks (`useProjects`, `useCreateProject`, etc.) for client-side data access.
- Updated documentation (Architecture, File Index) to capture new modules.
### 2025-10-13 — Planning Workspace Shell
- Created planning page (`/project/:id/planning`) with sections for scope, questions, query strategy, and outline.
- Added planning section component and shadcn primitives (card, textarea, label, separator, skeleton).
- Wired React Query provider into layout and used project hook to populate page header.
### 2025-10-13 — Activity Log Scaffolding
- Added API endpoints and hooks for activity logging (`/api/projects/:id/activity`).
- Implemented timeline component and Activity page at `/project/:id/activity`.
- Updated design docs with navigation and module references.
### 2025-10-13 — Search Stack Shell
- Added search API (`/api/projects/:id/search`) with background job enqueueing.
- Implemented candidates React Query hooks and triage workspace UI skeleton.
- Integrated Unpaywall enrichment and persisted results as candidates.
