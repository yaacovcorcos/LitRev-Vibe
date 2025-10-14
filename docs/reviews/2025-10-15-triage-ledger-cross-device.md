# Cross-Device Review — Triage & Evidence Ledger (2025-10-15)

Milestone 3 requires a responsive sweep across primary breakpoints so researchers have a consistent experience on clinic tablets and smaller laptops. This pass covered both the Search & Triage workspace and the Evidence Ledger inspector.

## Sessions

| Surface | Devices / Viewports | Notes |
|---------|---------------------|-------|
| Search & Triage | 1280×720 (Surface Go), 1024×768 (iPad), 768×1024 (iPad portrait), 390×844 (iPhone 14 Pro) | Header CTA group wraps cleanly; search form padding tightened for narrow widths; candidate cards collapse to single column with intact Ask-AI and locator controls. |
| Evidence Ledger | 1440×900 (MacBook Air), 1024×768, 768×1024, 390×844 | Navigation breadcrumbs and inspector swap to stacked layout under `lg`; locator banner keeps action button visible; metadata JSON scrolls horizontally without overflow clip. |

## Findings

- No blocking layout regressions across evaluated breakpoints.
- Triage search form previously used uniform padding that felt cramped on 390px; reduced to `p-4 sm:p-6` to preserve tap targets without wasting vertical space.
- Ledger inspector banner verified to maintain prominence on small screens; shared `LocatorBanner` component keeps tone styles consistent between page and Storybook.
- Metadata and locator lists remained legible; scrollbar hints visible when JSON exceeds viewport.

## Follow-ups

- Consider Playwright visual snapshots for 390px and 1024px once we stabilise story fixtures.
- Verify candidate card skeleton heights against live API payloads after snippet extraction ships, to avoid perceived jumps on tablet viewport.
