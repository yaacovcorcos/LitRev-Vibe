# LitRev-Vibe — MVP Implementation Plan (Rev 2)

This revision incorporates the parent specification requirements and addresses the main gaps identified during the first plan review: reliable citation locators, resilient long-running jobs, consistent persistence, broader search coverage, right-sized compose automation, and traceable integrity signals.

---

## 1. Product Slice & Success Criteria

- **End-to-end guided flow**: Question → Research Plan → Search (PubMed + Crossref) → Triage → Ledger → AI-assisted Literature Review → Export (Markdown/DOCX + PRISMA) with monitoring via Runs & Activity.
- **Locator guarantee**: Every AI-generated claim cites a ledger item with a validated locator captured from PDF/snippet, or the system blocks publish/exports until a human locator is supplied.
- **Recoverability**: Any long-running job (search, compose, export) survives restarts via durable queues and resumable state.
- **Manual control**: Users can intervene at every stage; methods/results/discussion remain human-authored with optional AI suggestions.
- **Integrity insights**: Retraction, open-access, and journal-quality signals are surfaced before ledger admission.
- **Reproducibility**: Research plan, query parameters, triage decisions, compose requests, and exports are logged and viewable/exportable.

---

## 2. Technology & Hosting

| Area                | Choice | Notes |
|---------------------|--------|-------|
| Frontend            | Next.js 14 (App Router), React, TypeScript, Tailwind, shadcn/ui | Aligns with existing design system direction. |
| Backend APIs        | tRPC routers on Next.js server components | Shared types, build-time safety. |
| Background Workers  | Durable queue (BullMQ + Redis on Upstash or Neon serverless functions) | Handles search/compose/export beyond Vercel limits; exposes resumable state in DB. |
| Database            | PostgreSQL (Neon/Supabase) + Prisma | Primary store for projects, plans, candidates, ledger, jobs, activity. |
| Object Storage      | Supabase Storage (or S3-compatible) | Stores fetched PDFs, PRISMA diagrams, exports. |
| Evidence Sources    | PubMed (metadata + abstracts), Crossref (metadata), Unpaywall (OA links), PDF text extraction (GROBID or plain PDF parser) | Gives locator-grade text; fallback manual locator entry. |
| AI Providers        | OpenAI (GPT-4 Turbo / GPT-4o) for triage, compose, and structured planning | Swap via adapter. |
| Integrity Data      | Retraction Watch API (or static feed), DOAJ list, internal watchlist | Processed nightly; surfaced in triage. |
| Authentication      | None (single-user workspace) | Deliberately deferred; design DB schema to add user_id columns later without refactor. |
| Deployment          | Vercel (UI & tRPC) + dedicated worker deployment (Fly.io/Render) for queues | Workers talk to Redis + Postgres. |
| Telemetry           | Sentry (errors), PostHog or Plausible (usage), OpenTelemetry logs for jobs | Required for audit/recovery visibility. |

---

## 3. UX/UI Strategy & Design Governance

### Experience Principles
- **Medical-grade calm**: Preserve generous spacing, restrained color palette, and clear typography so the workspace feels trustworthy, even when automation is running.
- **Clarity under complexity**: Surface primary actions, contextual breadcrumbs, and live automation status so users always understand what is happening and what comes next.
- **Progressive disclosure**: Keep advanced controls in inspectors/drawers so first-time users are not overwhelmed, while power users access tools quickly.
- **Consistency & delight**: Shared tokens (typography, color, spacing, elevation) and micro-interactions ensure the MVP already feels polished and future-ready.

### Design System Foundations
- Maintain a canonical design token library (`src/lib/design-system/`) that feeds Tailwind config, shadcn/ui themes, and design documentation.
- Ship high-fidelity component primitives (buttons, cards, data tables, inspectors, job timelines) with accessibility baked in (semantic markup, focus states, ARIA labels).
- Document page blueprints for each core view (Home, Planning, Triage, Ledger, Draft, Export) to guide future feature teams.
- Add automated linting/visual regression for UI components to catch spacing, color, or typographic regressions.

### Governance
- Establish a weekly design review cadence with a checklist covering responsiveness, accessibility, and adherence to experience principles.
- Log UX decisions and reference mocks in `DECISIONS.md`, and index assets via `FILE_INDEX.md`.
- Require design QA sign-off for each milestone before promoting to staging.

---

## 4. Architecture Principles

1. **Ledger boundary enforcement**: Draft and export layers query Ledger only; citation validator blocks non-ledger sources.
2. **Evidence provenance**: For each ledger item, persist origin (search adapter, manual upload), ingestion timestamp, and locator provenance (PDF page / paragraph index).
3. **Adapter pattern everywhere**: Search, AI, Export, Integrity signals use interfaces with dependency injection for testing and future providers.
4. **Durable workflows**: Search/compose/export jobs write checkpoints after each batch into `jobs.resumable_state`. Workers resume from checkpoints.
5. **Audit-first logging**: Every state transition (plan accepted, candidate kept, draft approved, export generated) logs to Activity timeline.
6. **Composable automation**: Automate literature review; expose other sections as human-first with AI suggestions (no auto-publish).
7. **Single-tenant first**: Operate as a single-user workspace during MVP; design schema/services with optional `user_id` fields reserved for future multi-user support.

---

## 5. AI-Agent Development Workflow

### Automation Guardrails
- Every agent-run task executes formatting, linting, unit tests, and Storybook visual checks (`pnpm lint`, `pnpm test`, `pnpm storybook:test`) before opening a PR; failures block deployment until resolved.
- Background workers, search adapters, and compose jobs must include deterministic unit or contract tests so future agents can refactor confidently.
- Shared script `scripts/agent-verify.sh` orchestrates the standard pre-flight suite; CI enforces the same pipeline to keep human/agent results aligned.
- Agents log all architectural or UX-impacting changes in `JOURNAL.md`, update `DECISIONS.md` when altering behavior, and refresh `FILE_INDEX.md` when adding notable files.

### Collaboration & Knowledge Sync
- Specs and design references remain the source of truth; agents must cite spec line numbers in PR descriptions to show compliance.
- Storybook (or Ladle) stays in sync with implemented components; every new UI element ships with a story and design notes link.
- Automated Slack/Teams notifications (or equivalent) post job status, nightly integrity ingestion results, and design QA outcomes so future agents pick up context quickly.
- The queue system exposes health metrics (success/failure counts, retry volume) via an Ops dashboard to inform autonomous recovery routines.

### Definition of Done for AI-generated PRs
- ✅ Code + schema changes compile, lint, format, and pass tests on CI.  
- ✅ UX-visible changes include updated stories, screenshot diffs reviewed, and accessibility audit evidence.  
- ✅ Documentation touchpoints (README, DECISIONS, JOURNAL, FILE_INDEX) reflect new behavior or structure.  
- ✅ Feature toggles or settings default to safe states and are documented in Project Settings copy.  
- ✅ Monitoring/alerting rules cover new jobs or adapters so descendent builds inherit observability.

---

## 6. Data Model Snapshot

Key tables (new fields highlighted):

- `projects`: id, name, description, settings (JSON), created_at, updated_at.
- `research_plans`: project_id, scope_json, query_strategy_json, target_sources (array), outline_json, status, created_at.
- `jobs`: project_id, type, status, progress, logs_json, resumable_state_json, worker_id, created_at, updated_at.
- `candidates`: project_id, search_adapter, external_ids_json, metadata_json, integrity_flags_json, oa_links_json, triage_status, ai_rationale, locator_snippets_json, created_at.
- `ledger_entries`: project_id, citation_key, metadata_json, provenance_json, locators_json (page/paragraph/sentence), integrity_notes_json, imported_from, kept_at, verified_by_human (bool).
- `draft_sections`: project_id, section_type, content_richtext_json, citations_json, status (empty/draft/approved), version, approved_at.
- `activity_log`: project_id, actor, action_type, payload_json, created_at, undo_pointer.
- `exports`: project_id, format, options_json, file_path, created_at, created_by_job.

Indexes added for quick lookup by `project_id`, `type+status`, and `citation_key`.

---

## 7. Functional Scope per Module

### 7.1 Research Planning (`/project/:id/planning`)
- Capture question, optional findings.
- AI plan generator suggests scope (PICO), key questions, strategies per supported source (currently PubMed & Crossref). Unsupported targets flagged with “manual search required” note.
- Output is editable; version history stored.
- “Run Search” triggers queue job with selected sources only.

### 7.2 Search & Triage (`/project/:id/triage`)
- PubMed + Crossref adapters unify schema; invokes Unpaywall for OA links and fetches PDFs where accessible.
- Integrity panel displays: retraction status, journal OA/trust indicator, citation anomaly heuristics (e.g., publisher flagged list).
- Ask-AI uses ingested PDF text (if available); otherwise, UI requires manual locator entry before keeping to ledger.
- Batch triage writes to Activity and updates job progress.

### 7.3 Evidence Ledger (`/project/:id/ledger`)
- Only kept records; inspector shows metadata, integrity notes, locator provenance, linked PDF snippet.
- Manual import supports RIS/BibTeX with required human locator entry if PDF parsing unavailable.
- Validation state: `pending_locator`, `locator_verified`.

### 7.4 Draft & Compose (`/project/:id/draft`)
- Section scope: Literature Review automated; Introduction/Methods/Results/Discussion/Conclusion human-first with AI “suggest improvements” (non-destructive suggestions with diff view).
- Compose job uses ledger entries + verified locators; fails if any citation lacks locator.
- Inline citation UI enforces ledger selection; manual locator editing allowed.
- Version history + rollback implemented via `draft_sections`.

### 7.5 Exports (`/project/:id/export`)
- Formats: Markdown, DOCX (APA & Vancouver styles), BibTeX.
- PRISMA generator consumes job telemetry (search counts, triage keeps/discards).
- Export job writes artifact to object storage, logs to exports table.
- Block export if ledger contains `pending_locator` entries (user can override per project setting but default is strict compliance).

### 7.6 Jobs & Runs (`/runs`)
- Frontend polls queue API; displays status, progress bar, resumable state snippet.
- Users can retry failed jobs; worker resumes from `resumable_state`.
- Job logs include API quota errors, PDF retrieval failures, etc.

### 7.7 Activity & Reproducibility (`/project/:id/activity`)
- Timeline entries grouped by modules; clicking an entry deep-links to context (e.g., ledger entry).
- Reproducibility panel exports JSON “recipe” with plan + search parameters + triage outcomes.

### 7.8 Project Settings & Preferences
- Locator policy toggle (strict vs. allow pending); default strict.
- Integrity flags configuration (enable/disable data feeds).
- Export defaults, citation style.
- Global preferences stored in DB (single-user mode still uses Postgres for persistence).

---

## 8. Implementation Milestones (12 Weeks)

### Milestone 0 (Week 0) — Foundations
- Confirm environment setup, secrets management, CI pipeline (lint/test).
- Provision Redis/queue worker infra; deploy hello-world worker consuming queues.
- Define Prisma schema & run migrations.
- Stand up design token library (colors, typography, spacing, shadows) and connect tokens to Tailwind/shadcn theme seeds.
- Configure Storybook (or equivalent) with seed component stories for design reference.

### Milestone 1 (Weeks 1-2) — Core Shell & Plan Data
- Build global layout, navigation, command palette.
- Implement project CRUD, planning page with AI plan generator, editable plan persistence.
- Activity log scaffolding.
- Deliver high-fidelity Home + Planning shells (responsive, accessible) and capture review feedback.
- Establish design QA checklist and baseline visual regression snapshots for core layouts.

### Milestone 2 (Weeks 3-4) — Search Stack
- Implement PubMed and Crossref adapters with rate-limit controls.
- Integrate Unpaywall + PDF fetch pipeline (store in object storage).
- Launch background job queue; search job writes candidates + job telemetry.
- Triage UI skeleton with candidate listing and integrity panel placeholders.
- Ship refined triage card components (loading, AI pending, flagged) with interaction specs and keyboard flows.

### Milestone 3 (Weeks 5-6) — Triage & Ledger
- OpenAI triage rationale, Ask-AI with PDF snippet quoting.
- Manual locator entry UI; enforce locator requirement before ledger move.
- Integrity feeds ingestion (Retraction Watch snapshot, DOAJ import) with nightly worker.
- Evidence Ledger page & inspector with locator verification states.
- Conduct cross-device usability review (desktop, tablet) for Triage and Ledger; document adjustments in JOURNAL.md. *(Completed 2025-10-15 — see `docs/reviews/2025-10-15-triage-ledger-cross-device.md`.)*

### Milestone 4 (Weeks 7-8) — Draft & Compose
- Implement citation validator + ledger-only enforcement.
- Compose job (literature review only) + Draft editor integration (Tiptap/Lexical).
- AI suggestions (non-automated) for other sections.
- Versioning + rollback support.
- Finalize draft workspace interaction patterns (section accordion, inspector, approvals) with annotated specs.

### Milestone 5 (Week 9) — Exports & PRISMA
- DOCX/Markdown/BibTeX adapters (APA + Vancouver).
- PRISMA diagram generation using job metrics.
- Export jobs + storage + download history.
- Polish Export page UX (progress visuals, history timeline) and PRISMA preview styling; hold design review before dev sign-off.

### Milestone 6 (Weeks 10-11) — Runs, Activity, Settings
- Runs dashboard with retry/resume controls.
- Activity timeline UI and reproducibility JSON export.
- Project/global settings, locator policy toggle, integrity feed toggles.
- Create reusable timeline & status badge components shared across surfaces; ensure dark/light theme parity.

### Milestone 7 (Week 12) — Hardening & Launch Prep
- Accessibility audit, automated tests (unit, integration, E2E flows).
- Load testing for queue workers; failover drills.
- Documentation updates (README, DECISIONS, JOURNAL).
- Monitoring dashboards (Sentry, queue metrics), staging review, launch go/no-go.
- Perform holistic UX polish pass (microcopy, spacing, responsiveness) and run moderated validation with target users.

---

## 9. Testing & Quality Strategy

- **Unit tests**: Adapters (search, integrity), citation validator, locator parser.
- **Integration tests**: tRPC routes + Prisma DB (TestContainers/Postgres).
- **Job pipeline tests**: Simulate resume after failure; ensure idempotency.
- **E2E tests**: Playwright scenario for full guided flow (question → export) under strict locator policy.
- **Data quality checks**: Nightly job verifying locator coverage %, retraction list freshness.
- **Security**: Secrets scanning, dependency scans, PDF sanitization (strip scripts).
- **Performance**: Queue throughput monitoring; budgets for compose run (<5 min) with partial streaming UI feedback.
- **Design QA**: Visual regression snapshots for key screens, automated accessibility linting, and manual review against the design checklist before merges.

---

## 10. Open Questions & Follow-ups

1. **Full-text licensing**: If OA coverage insufficient, identify legal path for partner-provided PDFs; otherwise, restrict automation to available OA sources and require human uploads.
2. **User authentication (deferred)**: Parent spec assumes single user; document migration strategy for adding user_id columns and enabling auth when nearing release.
3. **Manual review workflow**: Determine how human locator verification is tracked (e.g., require double-check for critical sections?).
4. **AI cost monitoring**: Add job cost estimates (tokens, API spend) for budgeting.
5. **Integration with future meta-analysis**: Ensure ledger schema can store effect sizes/extracted data for downstream features.
6. **Design ops tooling**: Confirm preferred tooling (Storybook/Chromatic vs. internal) and allocate support time.

---

## 11. Deliverables

- Updated MVP plan (this document) stored in repo.
- Revised DECISIONS.md summarizing infra changes (queue worker, expanded sources).
- Updated FILE_INDEX.md entry for plan/doc additions.
- Backlog tickets derived from milestone breakdown (tracked separately).
- Design system starter kit (tokens, component documentation, Storybook scaffolding) checked into repo.

---

## 12. Next Steps

1. Review & ratify this plan with stakeholders.
2. Align infrastructure budget & access (Redis, storage, integrity feeds).
3. Kick off Milestone 0 tasks and update JOURNAL.md with implementation log.
4. Stand up Storybook/Chromatic (or alternative) and capture initial component documentation.

---

## 13. AI Operator Task Backlog

AI agents should use this backlog as the execution queue. Each task includes acceptance criteria (AC) to guarantee production-quality output and long-term scalability.

### Milestone 0 — Foundations
- [ ] Create `scripts/agent-verify.sh` running format, lint, unit, and Storybook visual checks; wire script into CI (AC: CI fails if any stage fails; documentation added to README).  
- [ ] Implement design token source of truth and sync to Tailwind/shadcn theme; add Storybook typography/color stories (AC: tokens referenced in at least one component; stories reviewed).  
- [ ] Scaffold Storybook (or Ladle) with Chromatic/GitHub workflow for visual diffs (AC: baseline snapshot produced; CI comment on PR).  
- [ ] Define Prisma schema + migrations for core tables; seed fixture data for testing (AC: `pnpm prisma migrate dev` + `pnpm prisma db seed` succeed locally and in CI).  
- [ ] Deploy BullMQ worker service with health probes, connect to Redis instance, and log heartbeats (AC: health endpoint accessible; Rancher/Fly logs confirm poll loop).

### Milestone 1 — Core Shell & Plan Data
- [ ] Implement responsive app shell (sidebar, header, command palette) with accessibility checks (AC: keyboard traversal documented; axe audit passes).  
- [ ] Build Home + Planning pages with placeholder data bound to design tokens, plus visual regression snapshots (AC: Chromatic snapshot approved; design review sign-off recorded).  
- [ ] Create project CRUD tRPC procedures with React Query hooks and optimistic updates (AC: integration tests cover create/update/delete; Activity log captures actions).  
- [ ] Activate Activity logging pipeline with helper for structured entries (AC: log viewer displays new entries; seed data demonstrates format).  
- [ ] Update JOURNAL.md + DECISIONS.md with shell architecture notes and design decisions.

### Milestone 2 — Search Stack
- [ ] Ship PubMed adapter with contract tests, rate-limiting, and normalized DTOs (AC: adapter returns deterministic payloads under mocked API).  
- [ ] Implement Crossref adapter and planner-to-adapter mapping with unsupported-source warnings (AC: planning output only references supported adapters; tests verify filtering).  
- [ ] Integrate Unpaywall + PDF fetch storing metadata & object storage pointers (AC: candidate records include OA flag + locator source).  
- [ ] Build Search job worker with resumable state and telemetry logging (AC: job can pause/resume mid-batch in integration test).  
- [ ] Complete Triage page skeleton using triage card component states and keyboard flows (AC: Storybook stories for each state; Playwright smoke test).

### Milestone 3 — Triage & Ledger
- [x] Implement OpenAI-based triage rationale + batching with retry strategy (AC: job metrics capture success/fail counts; retry config documented).  
- [x] Deliver Ask-AI panel using PDF snippets and manual locator fallback (AC: keep-to-ledger blocked until locator present; UI prompts verified).  
- [x] Ingest Retraction Watch + DOAJ feeds nightly; surface signals in UI (AC: integrity flags shown on triage cards; monitoring alerts on ingestion failure).  
- [x] Finalize manual locator entry UX with validation states (`pending_locator`, `locator_verified`) (AC: unit tests cover transitions; ledger inspector reflects state).  
- [x] Publish Ledger page + inspector with responsive layout, design sign-off, and stories.

### Milestone 4 — Draft & Compose
- [x] Build citation validator enforcing ledger-only citations and verified locators (AC: failing validation blocks compose job; unit tests for edge cases). *(Implemented in `src/lib/compose/citation-validator.ts` with coverage in `src/lib/compose/citation-validator.test.ts`; validator throws via `assertCitationsValid`, ready for compose worker integration.)*  
- [x] Implement literature review compose worker with progress streaming to Runs page (AC: Playwright test for compose flow; job resumable mid-section).  
- [x] Integrate Draft editor (Tiptap/Lexical) with section approvals, rollback timeline, and inspector tie-ins (AC: version history persists; accessibility check passes).  
- [x] Add AI suggestion workflow for human-first sections with diff preview (AC: suggestions stored separately; acceptance toggles update content).  
- [x] Document draft UX patterns in design library + JOURNAL entry.

### Milestone 5 — Exports & PRISMA
- [ ] Implement DOCX adapter using `docx` + `citeproc-js` with APA/Vancouver templates (AC: golden-file tests compare outputs).  
- [ ] Build Markdown + BibTeX adapters with coverage for metadata variants (AC: unit tests for article/conference/book entries).  
- [ ] Generate PRISMA diagram from job metrics with preview & download (AC: diagram verified against sample data; snapshot stored).  
- [ ] Enforce export blocker when `pending_locator` entries exist; add override respecting project setting (AC: E2E test toggles policy).  
- [ ] Polish Export page UI (history timeline, progress states) with design approval and visual regression capture.

### Milestone 6 — Runs, Activity, Settings
- [ ] Complete Runs dashboard actions (retry, resume, cancel) with confirmation UX and backend hooks (AC: integration tests simulate state transitions).  
- [ ] Deliver Activity timeline + reproducibility JSON export; include deep links to context (AC: Playwright test exports JSON; timeline filters).  
- [ ] Implement project/global settings (locator policy, integrity toggles, citation style) with persistence (AC: settings reflected in compose/export flows).  
- [ ] Create reusable status badge + timeline components covering light/dark themes (AC: story coverage + visual diff).  
- [ ] Update documentation (README, DECISIONS, JOURNAL) summarizing operations surfaces.

### Milestone 7 — Hardening & Launch Prep
- [ ] Run comprehensive accessibility sweep (axe, keyboard, screen reader smoke) and fix findings (AC: accessibility report attached).  
- [ ] Execute load/resilience tests for queue workers (burst jobs, failure injection) with results logged (AC: incident playbook updated).  
- [ ] Ensure automated test suite covers >80% critical paths; CI enforces green builds (AC: coverage report stored; failing tests block merge).  
- [ ] Perform holistic UX polish (microcopy, spacing, responsive) with moderated validation sessions (AC: feedback logged; issues tracked).  
- [ ] Finalize deployment readiness checklist, including monitoring dashboards, alert thresholds, backup verification, and stakeholder sign-off.
