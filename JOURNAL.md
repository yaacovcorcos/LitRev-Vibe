# LitRev-Vibe — Working Journal

Track meaningful progress, context, and intent for every substantial change. Each entry should mention only the new work from that session; link to related docs or files where helpful.

## Entries

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

