# LitRev-Vibe — Changelog

Follow [Keep a Changelog](https://keepachangelog.com) principles at a milestone cadence. Document notable features, fixes, and infrastructure changes.

## [Unreleased]
- Add triage AI scaffolding: cached rationale generation, Ask-AI endpoint, and triage card updates.
- Introduce Evidence Ledger workspace skeleton with paginated API + inspector placeholder.
- Add manual locator capture API + inspector form for ledger entries.
- Surface locator verification status and pending warnings in the ledger workspace.
- Enforce locator requirement during triage “keep” flow with API + UI guardrails.
- Limit triage queue to pending candidates and hide kept references post-enforcement.
- Capture locator quotes and sources during keep + inspector workflows.
- Log activity entries when references move from triage to ledger.
- Add locator status helper with UI badges plus unit tests.
- Implement compose citation validator ensuring only verified ledger references are cited.
- Connect triage rationale & Ask-AI endpoints to OpenAI (fallbacks retained offline).
- Augment Ask-AI fallback with abstract-based quotes for environments without PDF snippets.
- Add integrity feed ingestion stub using local Retraction Watch/DOAJ datasets and candidate flagging.
- Separate locator "pending review" state with manual verification controls in ledger UI.
- Add triage rationale queue job for OpenAI batching with retry metrics.
- Use stored locator snippets when available (fallback for Ask-AI quotes and prompts).
- Added snippet extraction API/button to refresh PDF quotes from triage.
- Provide Storybook coverage for locator summaries.
- Queue-backed integrity feed ingestion job (Retraction Watch/DOAJ).
- Scheduled nightly integrity ingestion via worker cron hook with tests.
- Highlight integrity flags directly on triage cards with severity messaging.

## [2025-10-13] Milestone 0 — Foundations
- Added shared design tokens and Tailwind integration.
- Initialized Storybook with design docs and smoke tests.
- Scaffolded Prisma schema, migrations, and seed script.
- Implemented BullMQ worker with Redis helpers.
- Bootstrapped Next.js 14 App Router + shadcn/ui integration.
- Established guardrails (`agent-verify.sh`, `.env.example`, CI workflow).
