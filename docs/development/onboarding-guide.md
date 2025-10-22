# Development Onboarding Guide

This guide walks through the environment prerequisites and hands-on flow for the Milestone 1 slice (Planning → Triage → Ledger). Use it alongside the high-level checklist in the root `README.md`.

---

## 1. Prerequisites

| Service | Required? | Notes |
|---------|-----------|-------|
| PostgreSQL | ✅ | Apply migrations with `pnpm exec prisma migrate deploy`. Development defaults to `postgres://postgres:postgres@localhost:5432/litrev`. |
| Redis | ✅ (for background jobs) | Search, AI rationale, snippet extraction, and compose jobs enqueue via BullMQ. Start Redis locally (e.g., `redis-server`) and export `REDIS_URL`. |
| OpenAI | Optional | Needed for plan generation, triage rationale, Ask-AI, and draft automation. Set `OPENAI_API_KEY` when available; the UI falls back gracefully when unset. |
| Unpaywall | Optional | Populate `UNPAYWALL_EMAIL` to enrich search results with open-access metadata. |
| NCBI API Key | Optional | Supply `NCBI_API_KEY` to unlock higher PubMed rate limits. |

After copying `.env.example` to `.env`, fill in the variables you have access to. Leave unused keys empty—the application checks for their presence before making external calls.

---

## 2. Install & Bootstrap

```bash
pnpm install
pnpm exec prisma migrate deploy
pnpm exec prisma db seed   # optional, seeds a demo project for development
```

Start the core services in separate terminals:

```bash
pnpm run dev      # Next.js app
pnpm run worker   # BullMQ worker (requires Redis)
```

Optional extras:

- `pnpm run storybook` for component previews.
- `pnpm run playwright:test --grep @visual` for Design QA snapshots.

---

## 3. Guided Flow Walkthrough

1. **Create a project**  
   - Visit `http://localhost:3000/projects`, create a project, and confirm the activity entry appears under `/project/{id}/activity`.

2. **Draft the research plan**  
   - Navigate to `/project/{id}/planning`.  
   - Edit each section, hit “Save draft”, and refresh to verify persistence.  
   - If OpenAI is configured, experiment with “Generate with AI” and apply the suggestion preview.

3. **Search & triage evidence**  
   - Open `/project/{id}/triage`.  
   - Enter a query such as `("hypertension" OR "blood pressure") AND lifestyle` and submit.  
   - Identify newly created candidates, review integrity flags, ask clarifying questions, and try “Keep to ledger” after providing locator information.  
   - Use the discard control once Milestone 3 triage refinements ship.

4. **Inspect the Evidence Ledger**  
   - Browse `/project/{id}/ledger` to see the kept references.  
   - Add additional locators, mark entries as verified, and inspect provenance/locators JSON in the inspector.

5. **Monitor jobs & notifications**  
   - `/runs` surfaces queued/running/completed jobs with progress percentages.  
   - `/notifications` currently outlines the upcoming alert centre and links to Runs until live feeds are delivered.  
   - `/project/{id}/activity` confirms every action with timestamps and payload metadata.

---

## 4. Troubleshooting

- **Search jobs fail immediately**  
  Ensure Redis is running and `REDIS_URL` is reachable. Re-run the job from the Runs dashboard after fixing connectivity.

- **OpenAI requests are skipped**  
  The UI hides AI actions when `OPENAI_API_KEY` is absent. Supply the key or review the activity log for fallback messages.

- **Locator enforcement blocks ledger admission**  
  Locators must include at least one detail (page/paragraph/sentence/note/quote). The triage UI highlights missing fields—fill them before keeping a candidate.

---

## 5. Next Steps

- Review the remediation checklist (`docs/planning/milestones-1-4-remediation.md`) for outstanding work per milestone.  
- Follow the Design QA checklist (`docs/design/design-qa-checklist.md`) before promoting new UI changes.  
- Capture architectural and UX decisions in `DECISIONS.md` and `JOURNAL.md` to keep governance artifacts current.
