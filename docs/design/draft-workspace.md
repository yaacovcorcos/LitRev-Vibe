# Draft Workspace Interaction Patterns

This note captures the current authoring experience delivered in Milestone 4.

## Layout

- **Primary editor:** Tiptap-based rich text editor with a minimal toolbar (bold, italic, headings, bullet lists, undo/redo).
- **Inspector panel:** At-a-glance metadata for the active section (status, approval time, version count, linked evidence).
- **Timeline:** Version history rendered as a chronological list with restore actions; integrates with rollback API.
- **AI suggestions:** Non-destructive improvements with structured diff previews (`before/after`) and accept/dismiss affordances.
- **Linked evidence:** Badged list of ledger entries backing the active section.

## Workflow

1. Drafts load in editable mode until marked as approved.
2. Changes are persisted via the "Save draft" action; each save increments the version counter and records a snapshot.
3. Approving a section disables editing, records an approval timestamp, and still allows viewing history/suggestions.
4. Approved sections can be reopened; reopening clears the approval timestamp and re-enables editing.
5. Version restores and AI suggestion acceptance both route through the shared versioning helpers to guarantee idempotence; restored cards display sentence-level diffs plus primary locator summaries for reviewer awareness.

## Accessibility

- Toolbar buttons expose `aria-pressed` state and keyboard focus styles.
- Status/feedback messages announce via `aria-live="polite"`.
- Inspector details presented as a `<dl>` for semantic grouping.
- Buttons are keyboard reachable and provide text labels for screen readers.

## Open Follow-ups

- Add granular keyboard shortcuts beyond the default Tiptap bindings.
- Expand inspector to surface linked suggestion history once moderation workflows solidify.
