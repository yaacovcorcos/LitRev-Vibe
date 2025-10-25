# Background Jobs & Pipelines

LitRev-Vibe relies on BullMQ workers to orchestrate long-running tasks. This guide captures the current queues, data flow, and developer expectations when extending job handling.

## Search → PDF Ingestion Pipeline

1. **Search Execution (`search:enqueue`)**
   - Triggered from the triage UI (`useEnqueueSearch`).
   - Payload includes `projectId`, query metadata, and the array of adapter IDs selected by the user.
   - The job persists `candidates` rows, merging metadata when a candidate already exists and logging adapter telemetry for audit.

2. **PDF Ingestion (`pdf:ingest`)**
   - Enqueued for each open-access link discovered during search persistence.
   - Processor downloads the PDF, extracts plain text via `pdf-parse`, and stores the artifact using `storeCandidatePdf(projectId, candidateId)`.
   - Candidate metadata is updated with `hasPdfArtifact` plus artifact path; locator snippets are extracted for downstream Ask-AI and compose prompts.
   - Failures are logged but do not abort the parent search job; retries follow BullMQ defaults.

3. **Downstream Consumers**
   - Ask-AI panel, triage rationale, and compose prompts read stored PDFs/snippets to provide context.
   - Locator readiness checks rely on the extracted snippets to suggest pointer/context content when available.

## Compose & Suggestion Jobs

- **Compose (`compose:generate`)**
  - Consumes selected ledger entry IDs and narrative voice.
  - Validates citations via `assertCitationsValid`; throws when any ledger entry lacks verified locator requirements.
  - Invokes `generateComposeDocument` (OpenAI) with project metadata, ledger summaries, and primary locator details.
  - Persists draft content, records a new `draft_section_versions` snapshot (including locator summaries), and logs activity.

- **Suggestions (`draft:suggest`)**
  - Uses `generateSuggestion` to produce narrative diffs for human-first sections.
  - Stores structured diff payloads (`append_paragraph` today) and summary copy for review.
  - Accepting a suggestion promotes content into the draft and records a new version snapshot; dismissing logs the action only.

## Operational Expectations

- All processors live in `src/lib/queue/worker.ts`; add new job constants and handler wiring there.
- Jobs must be idempotent—reruns after partial completion should not duplicate rows or artifacts.
- Record telemetry (adapter IDs, locator readiness, compose status) so Runs UI and future analytics remain trustworthy.
- Extend this document whenever new queues are introduced or behavior changes (retry policy, concurrency, storage location).
