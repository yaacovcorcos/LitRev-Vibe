# Contributing Guide (AI & Human Operators)

This project is optimized for autonomous coding agents. Follow the workflow below to keep quality and documentation consistent.

## 1. Verify Before You Commit
- Run `./scripts/agent-verify.sh`.
- Ensure `pnpm run build`, `pnpm run lint`, and `pnpm run storybook:test` pass (the guardrail script already does this).

## 2. Update Documentation
- `JOURNAL.md`: log what changed, why, and by whom (agent name or user).
- `DECISIONS.md`: record architecture/Product decisions (ADR-lite format).
- `FILE_INDEX.md`: add new directories/modules with one-line descriptions.
- `CHANGELOG.md`: summarize milestone-level changes when shipping major features.
- `GLOSSARY.md`: add new domain terms or update definitions.

## 3. Code Style & UI Consistency
- Use design tokens (`src/lib/design-system/tokens.ts`) instead of hardcoded values.
- Add or update shadcn/ui components via `pnpm dlx shadcn@latest add <component>`.
- Include Storybook stories for new UI components or states.

## 4. Testing & Seeds
- Add unit/integration tests as modules gain functionality.
- Keep `prisma/seed.ts` representative of demo data used in docs or screenshots.

## 5. Pull Requests / Changesets
- Reference relevant spec lines or decisions in PR descriptions.
- Link to docs you updated (Journal, Decisions, etc.) for traceability.

## 6. Roadmap Awareness
- Review `docs/planning/litrev-mvp-implementation-plan-v2.md` before starting a task.
- If work deviates from the plan, add a new decision record and update the plan where appropriate.

Thank you for keeping the repo agent-friendly and future-ready!
