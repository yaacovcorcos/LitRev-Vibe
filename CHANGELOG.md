# LitRev-Vibe — Changelog

Follow [Keep a Changelog](https://keepachangelog.com) principles at a milestone cadence. Document notable features, fixes, and infrastructure changes.

## [Unreleased]
- Added `/projects` workspace view with create/delete flows, quick links into planning/triage/ledger/draft, and refresh controls.
- Hardened locator capture pipeline (API + UI) and aligned JSON payloads with Prisma types.
- Cleaned documentation (`README.md`, `CHANGELOG.md`) to prep for the export milestone.

## [2025-10-16] Milestone 4 — Draft & Compose
- Delivered compose queue job with citation validation, draft section persistence, and resumable progress tracking.
- Built Draft workspace UI (Tiptap editor, section selector, approvals, version restore, job status wiring).
- Implemented AI suggestion workflow with activity logging, acceptance/dismissal flows, and versioned snapshots.
- Added compose worker coverage (Vitest + Playwright resume harness) and runs dashboard integration.

## [2025-10-15] Milestone 3 — Triage & Evidence Ledger
- Introduced Evidence Ledger inspector with locator management, integrity notes, and pagination scaffolding.
- Enforced locator-on-keep rule (API + React Query hooks) and locator verification states with badges/banners.
- Connected triage rationale + Ask-AI endpoints to OpenAI with graceful fallbacks and snippet extraction jobs.
- Wired integrity feed ingestion (Retraction Watch / DOAJ stubs), nightly scheduler, and candidate flag surfacing.

## [2025-10-14] Milestone 2 — Search Stack
- Added PubMed + Crossref search adapters with rate limiting and Unpaywall enrichment.
- Persisted search candidates via background jobs, with queue retries and telemetry summaries.
- Exposed triage workspace skeleton, candidate cards, and Ask-AI scaffolding.

## [2025-10-13] Milestone 1 — Shell & Planning
- Implemented App Shell (sidebar/header/command palette) and global layout wiring.
- Added project CRUD REST endpoints, React Query hooks, and planning workspace with editable sections.
- Introduced activity log scaffolding and navigation metadata.

## [2025-10-13] Milestone 0 — Foundations
- Added shared design tokens and Tailwind integration.
- Initialized Storybook with design docs and smoke tests.
- Scaffolded Prisma schema, migrations, and seed script.
- Implemented BullMQ worker with Redis helpers.
- Bootstrapped Next.js 14 App Router + shadcn/ui integration.
- Established guardrails (`agent-verify.sh`, `.env.example`, CI workflow).
