# Design QA Checklist

Track visual and interaction regressions before shipping shell updates. Review this list before merging any UI-facing pull request.

## 1. Visual Regression
- [ ] Run `pnpm playwright:test --project chromium --grep @visual` (or `pnpm playwright:test` for the full suite) to capture screenshots for Home, Projects, and Planning pages.
- [ ] Inspect diff artifacts in Playwright report. Confirm intentional changes and update baselines with `pnpm playwright:test --update-snapshots` if needed.
- [ ] Ensure antialiasing / font rendering deltas are ≤ 0.1% (Playwright threshold). Large diffs require manual signoff in PR notes.

## 2. Accessibility & Semantics
- [ ] `pnpm test` passes—includes axe audits for shell pages.
- [ ] Landmarks (`nav`, `main`, `header`, `dialog`) keep unique labels when new sections are added.
- [ ] Focus order verified for new interactive elements (Tab → Shift+Tab).
- [ ] ESC and shortcut handlers (⌘/Ctrl + K, mobile drawer) behave after layout changes.

## 3. Responsive Behaviour
- [ ] Validate 375px, 768px, and 1280px widths manually or via devtools presets.
- [ ] Confirm shell controls (sidebar toggle, command palette trigger) stay reachable on narrow viewports.
- [ ] Avoid horizontal scrollbars; audit `overflow` and padding on new sections.

## 4. Theming & Contrast
- [ ] Confirm additions respect Tailwind tokens (`bg-background`, `text-foreground`, etc.).
- [ ] Check dark mode in Storybook or devtools color scheme override.
- [ ] Maintain ≥ 4.5:1 contrast for body text, ≥ 3:1 for UI controls.

## 5. Regression Communication
- [ ] Document notable visual changes in PR summary (include screenshot thumbnails when meaningful).
- [ ] Mention any updated baselines or new coverage in `JOURNAL.md`.
- [ ] Flag cross-team approvals if screens affect workflows outside Milestone 1 scope.

Keep this checklist synced with the Playwright baselines. Update the list whenever new surfaces or workflows gain visual guardrails.
