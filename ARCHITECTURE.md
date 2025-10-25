# LitRev-Vibe — Architecture Overview

## High-Level Modules

- **App Shell (`src/app/`)**: Next.js App Router root (`layout.tsx`, `page.tsx`). Hosts global styles, fonts, and future routed pages (planning, triage, ledger, etc.).
- **Layout Components (`src/components/layout/`)**: Sidebar, header, command menu, and `AppShell` wrapper used by the App Router layout.
- **Design System (`src/lib/design-system/`)**: Authoritative tokens (`tokens.ts`) and theme adapters (`theme.ts`). Shared by Tailwind, shadcn/ui, Storybook, and export pipelines.
- **UI Primitives (`src/components/ui/`)**: shadcn/ui generated components consuming shared tokens. Add new primitives via `pnpm dlx shadcn@latest add <component>`.
- **Queue Infrastructure (`src/lib/queue/`)**: Redis connection helpers, queue definitions, and worker setup for resumable jobs. `src/scripts/run-worker.ts` boots a worker.
- **Prisma Layer (`prisma/`)**: Database schema (`schema.prisma`), migrations, seed data, and Prisma client wrapper (`src/lib/prisma.ts`).
- **API Routes (`src/app/api/projects`)**: REST endpoints providing project CRUD backed by Prisma.
- **Client Hooks (`src/hooks/`)**: React Query hooks for fetching/mutating project, search, and triage data.
- **AI Layer (`src/lib/ai/`)**: AI orchestration helpers (triage rationale generation, Ask-AI proxying, rate limiting).
- **Storybook (`.storybook/`, `src/stories/`)**: Visual documentation of tokens and components. Stories must stay in sync with UI updates.
- **Planning Workspace (`src/app/project/[id]/planning`)**: Client-side planning editor composed of reusable planning section components.
- **Activity Timeline (`src/app/project/[id]/activity`)**: Timeline view of project events backed by React Query hooks and shadcn UI cards.
- **Triage Workspace (`src/app/project/[id]/triage`)**: Candidate search/triage UI wired to search jobs and React Query hooks.
- **Evidence Ledger (`src/app/project/[id]/ledger`)**: Vetted reference workspace with inspector for metadata, locators, and integrity signals.
- **Artifact Storage (`src/lib/storage/`)**: Helpers for persisting candidate PDFs and resolving on-disk/object-storage paths consumed by ledger/AI workflows.
- **Notifications Workspace (`src/app/notifications`)**: Placeholder page outlining upcoming alert feeds and linking to runs/activity surfaces; prevents navigation dead-ends until real notifications ship.
- **Automation Scripts (`scripts/`)**: `agent-verify.sh` guardrails, additional automation will live here.

## Data Flow (Current)
1. **Design tokens** feed Tailwind config, shadcn/ui components, and Storybook stories.
2. **Next.js app** renders through `AppShell`, providing the persistent sidebar/header frame around routed pages.
3. **React Query provider** supplies caching/invalidation for client hooks.
4. **API routes** call Prisma via the shared client, enabling CRUD for projects.
5. **Queue worker** connects to Redis using shared helper; search jobs enqueue PDF ingest work which streams artifacts into project-scoped storage and annotates candidates.
6. **Compose/Suggestion workers** consume verified ledger entries, AI prompts, and stored locator context to generate prose and human-review diffs.
7. **Prisma** defines project/research plan/candidate/ledger schemas and their versioning/locator metadata.

## Planned Expansions
- **tRPC / API Layer**: Will expose typed endpoints for project CRUD, planning, triage. Document routes under `docs/api/TRPC_ROUTES.md` (placeholder).
- **Adapter Interfaces**: Search (PubMed, Crossref), AI (planning, triage, compose), Export—all will use adapter contracts documented under `docs/api/ADAPTERS.md` (placeholder).
- **Module READMEs**: Each major folder (`src/app/project`, `src/lib/queue`, etc.) will include purpose, submodules, and public interfaces.
- **Integrity Safeguards**: Locator readiness checklist (pointer + context + citation verification) blocks ledger verification and compose/export jobs until satisfied; surfaced via `src/lib/ledger/locator-readiness.ts` and UI toasts.

Keep this document updated as new modules are introduced or responsibilities shift.
