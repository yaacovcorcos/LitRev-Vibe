# LitRev-Vibe — Architecture Overview

## High-Level Modules

- **App Shell (`src/app/`)**: Next.js App Router root (`layout.tsx`, `page.tsx`). Hosts global styles, fonts, and future routed pages (planning, triage, ledger, etc.).
- **Layout Components (`src/components/layout/`)**: Sidebar, header, command menu, and `AppShell` wrapper used by the App Router layout.
- **Design System (`src/lib/design-system/`)**: Authoritative tokens (`tokens.ts`) and theme adapters (`theme.ts`). Shared by Tailwind, shadcn/ui, Storybook, and export pipelines.
- **UI Primitives (`src/components/ui/`)**: shadcn/ui generated components consuming shared tokens. Add new primitives via `pnpm dlx shadcn@latest add <component>`.
- **Queue Infrastructure (`src/lib/queue/`)**: Redis connection helpers, queue definitions, and worker setup for resumable jobs. `src/scripts/run-worker.ts` boots a worker.
- **Prisma Layer (`prisma/`)**: Database schema (`schema.prisma`), migrations, seed data, and Prisma client wrapper (`src/lib/prisma.ts`).
- **API Routes (`src/app/api/projects`)**: REST endpoints providing project CRUD backed by Prisma.
- **Client Hooks (`src/hooks/use-projects.ts`)**: React Query hooks for fetching/mutating project data.
- **Planning Workspace (`src/app/project/[id]/planning`)**: Client-side planning editor composed of reusable planning section components.
- **Storybook (`.storybook/`, `src/stories/`)**: Visual documentation of tokens and components. Stories must stay in sync with UI updates.
- **Planning Workspace (`src/app/project/[id]/planning`)**: Client-side planning editor composed of reusable planning section components.
- **Activity Timeline (`src/app/project/[id]/activity`)**: Timeline view of project events backed by React Query hooks and shadcn UI cards.
- **Triage Workspace (`src/app/project/[id]/triage`)**: Candidate search/triage UI wired to search jobs and React Query hooks.
- **Automation Scripts (`scripts/`)**: `agent-verify.sh` guardrails, additional automation will live here.

## Data Flow (Current)
1. **Design tokens** feed Tailwind config, shadcn/ui components, and Storybook stories.
2. **Next.js app** renders through `AppShell`, providing the persistent sidebar/header frame around routed pages.
3. **React Query provider** supplies caching/invalidation for client hooks.
4. **API routes** call Prisma via the shared client, enabling CRUD for projects.
5. **Queue worker** connects to Redis using shared helper; sample heartbeat job verifies infrastructure.
6. **Prisma** defines project/research plan/candidate/ledger schemas for upcoming modules.

## Planned Expansions
- **tRPC / API Layer**: Will expose typed endpoints for project CRUD, planning, triage. Document routes under `docs/api/TRPC_ROUTES.md` (placeholder).
- **Adapter Interfaces**: Search (PubMed, Crossref), AI (planning, triage, compose), Export—all will use adapter contracts documented under `docs/api/ADAPTERS.md` (placeholder).
- **Module READMEs**: Each major folder (`src/app/project`, `src/lib/queue`, etc.) will include purpose, submodules, and public interfaces.

Keep this document updated as new modules are introduced or responsibilities shift.
