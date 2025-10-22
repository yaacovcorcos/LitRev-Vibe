# 2025-10-16 — Shell Accessibility Audit

## Scope
- Home (`/`)
- Projects (`/projects`)
- Planning (`/project/:id/planning`)

Tooling:
- Automated: `pnpm test` (vitest + `vitest-axe`) exercising each page inside the app shell.
- Manual: keyboard-only pass (Tab/Shift+Tab, ⌘K trigger, mobile nav toggle) at desktop width and a 375px viewport.

Environment: jsdom for automated checks; manual pass conducted against local Next.js dev build.

## Findings & Resolutions
- ❌ `nav` landmarks in the Planning workspace lacked unique accessible names (triggered `landmark-unique`, `landmark-no-duplicate-banner/main`).  
  ✅ Added explicit `aria-label="Workspace navigation"` to the sidebar nav and `aria-label="Breadcrumb"` to planning breadcrumbs so landmarks are distinguishable.
- ⚠️ `HTMLCanvasElement#getContext` warnings surfaced in jsdom when running axe. Stubbed the API in `vitest.setup.ts` to silence unsupported calls during tests (no runtime impact).
- ✅ Command palette, mobile navigation dialog, and global header all respect keyboard focus order and ESC dismissal. Verified focus trap within the mobile drawer and that ⌘/Ctrl + K returns focus to the trigger on close.

## Results
- Home: No violations reported; keyboard flow confirmed (header → command trigger → notification button).  
- Projects: No violations after fixes; tab order respects semantic grouping; action buttons reachable.  
- Planning: Axe now passes with clean slate; breadcrumb, sidebar, and main content landmarks properly labeled.

## Next Steps
- Monitor future pages for landmark duplication; follow the `aria-label` pattern when introducing additional nav/section landmarks.
- Consider extending automated coverage to other project routes (Triage, Ledger) once they stabilise.
