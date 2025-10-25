# LitRev-Vibe — Decision Record (ADR-lite)

Document pivotal architectural or product choices. For each entry, capture the context, the decision, and its consequences. Link to related docs, code modules, or specs where applicable.

## Entries

### 2025-10-13 — Single-Tenant MVP, Deferred Auth
- **Context:** Parent release must optimize for solo scientists; authentication complicated local setup.
- **Decision:** Ship MVP as a single-user workspace with no authentication; schema reserves room for future `user_id`.
- **Consequences:** Simplifies early development; migration plan required when enabling multi-user features for the Descendant release.

### 2025-10-13 — Shared Design Tokens as Source of Truth
- **Context:** UI must remain consistent across app shell, shadcn/ui components, Storybook, exports.
- **Decision:** Define tokens in `src/lib/design-system/tokens.ts` and feed Tailwind, shadcn/ui, Storybook, and future adapters via that source.
- **Consequences:** Visual changes flow through one layer; teams must update tokens before styling components.

### 2025-10-13 — BullMQ + Redis for Durable Jobs
- **Context:** Milestone plan requires resumable search/compose/export with queue visibility.
- **Decision:** Adopt BullMQ with Redis (worker outside Vercel limits); expose job status via Runs UI.
- **Consequences:** Queue infrastructure must be provisioned alongside app deployments; future jobs should reuse shared worker helpers in `src/lib/queue`.

### 2025-10-16 — Draft Version Snapshots for Idempotent Compose
- **Context:** Compose retries could duplicate draft sections when BullMQ reruns a job after partial completion.
- **Decision:** Persist per-version snapshots in `DraftSectionVersion`, rehydrate resumable state from job records, and reuse existing draft IDs when a section restarts.
- **Consequences:** Compose jobs become idempotent across retries; rollback APIs and UI can restore earlier versions without data loss.

### 2025-10-17 — Persist Research Plan as Single JSON Document
- **Context:** The planning workspace needed durable storage before layering optimistic saves, AI plan generation, and activity logging.
- **Decision:** Store each project's research plan as a single `ResearchPlan` record keyed by `projectId`, keeping editable sections (scope, questions, query strategy, outline) as JSON but exposing text payloads via the API.
- **Consequences:** Planning UI can hydrate/sync with one endpoint, optimistic mutations stay simple, and future AI/autosave features can enrich the same record without schema sprawl.

### 2025-10-22 — Transition Project CRUD to tRPC
- **Context:** REST endpoints for project CRUD duplicated logic and made optimistic updates + activity logging cumbersome within the React Query client.
- **Decision:** Adopt tRPC (with superjson) for project lifecycle operations, exposing typed procedures consumed via `@trpc/react-query` and logging create/update/delete actions centrally.
- **Consequences:** Projects page benefits from optimistic UX and typed hooks; future modules can share the tRPC gateway without duplicating serialization or error handling.

### 2025-10-23 — Notifications Workspace Placeholder
- **Context:** Milestone 1 navigation surfaced a Notifications link that routed to a 404, breaking the shell experience.
- **Decision:** Ship a client-side `/notifications` page stub describing the upcoming alerting features and linking to Runs, keeping the navigation viable until real feeds land.
- **Consequences:** Users no longer hit a dead-end when exploring the workspace; remediation plan stays actionable without hiding the destination.

### 2025-10-25 — Project-Aware Navigation Resolution
- **Context:** The workspace sidebar needed to direct users into project-scoped routes using the currently active project without forcing manual URL editing.
- **Decision:** Derive the active project ID from the pathname in `Sidebar`, resolve `/project/:id/*` links through helpers in `src/lib/navigation.ts`, and disable project-scoped items when no project context exists.
- **Consequences:** Navigation stays context-aware across planning, draft, export, and settings surfaces, preventing broken links and clarifying state when no project is selected; regression coverage was added to guarantee routing behavior.

### 2025-10-25 — Multi-Adapter Triage Execution
- **Context:** Search jobs needed to query multiple providers in one batch while preserving provenance for downstream ledger records.
- **Decision:** Added adapter toggle tray to the triage UI with per-project persistence; search payloads now include the adapter array and telemetry logs it for auditing.
- **Consequences:** Users can blend Crossref/PubMed (and future adapters) in one run, and ledger entries retain adapter metadata for reproducibility.

### 2025-10-25 — PDF Artifact Ingestion Pipeline
- **Context:** Open access PDFs must be captured automatically to power Ask-AI, locator extraction, and compose prompts.
- **Decision:** Search persistence enqueues `pdf:ingest` jobs that download artifacts, extract text via `pdf-parse`, store them under `src/lib/storage/pdf.ts`, and update candidate metadata with locator snippets.
- **Consequences:** Subsequent workflows have consistent source text; failures stay isolated to individual ingest jobs without blocking search completion.

### 2025-10-25 — Curator Return Loop & Locator Checklist
- **Context:** Curators needed a controlled way to send ledger entries back to triage and ensure locator completeness before verification.
- **Decision:** Introduced `/ledger/:entryId/return` endpoint for transactional rollback and surfaced locator readiness checklist/toast guards in the inspector.
- **Consequences:** Ledger integrity remains high, activity logs capture full history, and compose/export operations stay aligned with locator policy.

### 2025-10-25 — AI Compose & Suggestion Generators
- **Context:** Draft sections required model-generated prose while giving reviewers transparent diffs for manual sections.
- **Decision:** Implemented OpenAI-backed compose and suggestion generators with structured JSON contracts and deterministic fallbacks; both record version snapshots including locator metadata.
- **Consequences:** Draft automation produces citation-aware prose with rollbackable history, and reviewers can accept/dismiss improvements with clear before/after context.
