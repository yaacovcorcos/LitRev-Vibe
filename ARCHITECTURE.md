# LitRev-Vibe — Architecture Overview

## High-Level Modules

- **App Shell (`src/app/`)**: Next.js App Router root (`layout.tsx`, `page.tsx`). Hosts global styles, fonts, and future routed pages (planning, triage, ledger, etc.).
- **Design System (`src/lib/design-system/`)**: Authoritative tokens (`tokens.ts`) and theme adapters (`theme.ts`). Shared by Tailwind, shadcn/ui, Storybook, and export pipelines.
- **UI Primitives (`src/components/ui/`)**: shadcn/ui generated components consuming shared tokens. Add new primitives via `pnpm dlx shadcn@latest add <component>`.
- **Queue Infrastructure (`src/lib/queue/`)**: Redis connection helpers, queue definitions, and worker setup for resumable jobs. `src/scripts/run-worker.ts` boots a worker.
- **Prisma Layer (`prisma/`)**: Database schema (`schema.prisma`), migrations, and seed data. Services will import generated client from `src/generated/prisma` (ignored in git).
- **Storybook (`.storybook/`, `src/stories/`)**: Visual documentation of tokens and components. Stories must stay in sync with UI updates.
- **Automation Scripts (`scripts/`)**: `agent-verify.sh` guardrails, additional automation will live here.

## Data Flow (Current)
1. **Design tokens** feed Tailwind config, shadcn/ui components, and Storybook stories.
2. **Next.js app** renders static landing page (placeholder) leveraging Tailwind and tokens.
3. **Queue worker** connects to Redis using shared helper; sample heartbeat job verifies infrastructure.
4. **Prisma** defines project/research plan/candidate/ledger schemas for upcoming modules.

## Planned Expansions
- **tRPC / API Layer**: Will expose typed endpoints for project CRUD, planning, triage. Document routes under `docs/api/TRPC_ROUTES.md` (placeholder).
- **Adapter Interfaces**: Search (PubMed, Crossref), AI (planning, triage, compose), Export—all will use adapter contracts documented under `docs/api/ADAPTERS.md` (placeholder).
- **Module READMEs**: Each major folder (`src/app/project`, `src/lib/queue`, etc.) will include purpose, submodules, and public interfaces.

Keep this document updated as new modules are introduced or responsibilities shift.
