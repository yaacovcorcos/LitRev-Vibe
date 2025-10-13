# Module: `src/lib`

Shared libraries consumed across the application.

## Submodules
- `design-system/`
  - `tokens.ts` — Source of truth for colors, typography, spacing, elevation, radii.
  - `theme.ts` — Helper for shadcn/ui and other consumers.
- `queue/`
  - `redis.ts` — Redis connection management.
  - `queue.ts` — Queue definitions and helpers.
  - `worker.ts` — Worker setup and event logging.
- `utils.ts`
  - `cn()` — Tailwind-aware class name merge helper.

## Planned Additions
- `ai/` — Adapters/prompts for planning, triage, compose flows.
- `search/` — PubMed/Crossref adapter interfaces and helpers.
- `exports/` — Format adapters (DOCX, Markdown, BibTeX, PRISMA diagrams).

Update this README as new submodules are introduced.
