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

## [2025-10-13] Milestone 0 — Foundations
- Added shared design tokens and Tailwind integration.
- Initialized Storybook with design docs and smoke tests.
- Scaffolded Prisma schema, migrations, and seed script.
- Implemented BullMQ worker with Redis helpers.
- Bootstrapped Next.js 14 App Router + shadcn/ui integration.
- Established guardrails (`agent-verify.sh`, `.env.example`, CI workflow).
