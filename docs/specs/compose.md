# Compose & Suggestion Generation

## Overview

Compose workflows transform verified ledger entries into narrative prose while suggestions provide human-in-the-loop improvements for non-automated sections. Both rely on OpenAI with deterministic fallbacks when the model is unavailable.

## Compose Generator (`generateComposeDocument`)

- **Inputs**
  - `projectId`, `sectionId`, section configuration, narrative voice.
  - Ledger entries (verified locators only) with metadata + primary locator summaries.
- **Prompt Strategy**
  - System prompt establishes medical literature review tone and citation format.
  - User payload includes research question, narrative voice hints, ledger metadata, locator summaries, and prior compose attempts (when rerunning).
- **Output Handling**
  - Parses structured JSON (ProseMirror doc); falls back to deterministic paragraph when parsing fails.
  - Writes draft content via compose job transaction and records a new `DraftSectionVersion` snapshot with locator array.
  - Logs `draft.compose_completed` activity with section ID and version.

## Suggestion Generator (`generateSuggestion`)

- **Inputs**
  - Current paragraph excerpt, section heading, verified citation list, narrative voice.
- **Prompt Strategy**
  - Requests JSON with `summary` + `paragraphs[]` representing improvement copy.
  - Reinforces citation requirements (must reference `[citationKey]`).
- **Diff Payload**
  - Suggestions store a structured diff `{ type: "append_paragraph", before, after }` for UI previews.
  - Accepting a suggestion replaces draft content and records a new version snapshot; dismissing logs without mutations.
- **Fallback**
  - Deterministic sentence referencing available citations when OpenAI unavailable or outputs malformed JSON.

## Guardrails

- Citation validator (`assertCitationsValid`) runs before compose job; missing locator readiness halts processing.
- History snapshots include locator arrays for every success path, enabling rollback diff previews.
- Activity log events (`draft.suggestion_created`, `draft.suggestion_accepted`, etc.) power the project timeline.

## Future Enhancements

- Multi-paragraph diffs (support `replace_block` variants) once UI diff viewer expands.
- Token budgeting instrumentation per job to surface OpenAI spend.
- Template customisation for different review voices (systematic review vs. narrative overview).
