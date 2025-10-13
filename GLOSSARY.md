# LitRev-Vibe — Glossary

Reference terminology used across the product spec, codebase, and documentation. Add new terms as the platform evolves.

- **Evidence Ledger** — Structured store of accepted references with provenance and locators; single source of truth for citations.
- **Locator** — Precise page/paragraph/sentence identifier grounding a citation.
- **Candidate** — Retrieved article awaiting triage (Keep/Discard) before entering the Evidence Ledger.
- **Triage Card** — UI summary of a candidate article, including metadata, integrity signals, and AI recommendations.
- **Keep / Discard** — Triage decisions; Keep moves a candidate into the Evidence Ledger, Discard removes it while logging an optional reason.
- **Research Plan** — Structured scope, key questions, query strategy, target sources, and initial outline created during planning.
- **Job** — Long-running background task (search, compose, export) managed by the queue/worker system.
- **Runs** — UI surface listing background jobs, their status, logs, and resumable state.
- **PRISMA Diagram** — Flow visualization summarizing screening stages for literature reviews.
- **Automation by Choice** — Principle allowing users to toggle between manual steps and AI automation at any workflow stage.
- **Parent Release** — MVP scope shipping now; focuses on single-user workspace with literature review foundations.
- **Descendant Release** — Future flagship scope with collaboration, advanced appraisal, and meta-analysis features.
