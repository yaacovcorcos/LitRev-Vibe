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
