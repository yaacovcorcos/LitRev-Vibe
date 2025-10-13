# **App Pages & Routes – Parent Version (Living List)**

*Rule: prefer **pages** that will remain stable long‑term. Use panels/drawers/modals only for UX elements that are **inherently overlays** (e.g., command palette) and will **stay** that way.* 

---

## **Global Pages**

1. **Login (stub)**  
    Route: `/login`  
    Notes: Blank page with centered **Enter the app**; (placeholder for future authentication system).

2. **Home (Global Hub) [full description](https://docs.google.com/document/d/10OHcGiOEeEeRLSm6cqD3LK6wE6YdFElD/edit?usp=drive_link&ouid=102943785294856495437&rtpof=true&sd=true)**  
    Route: `/`  
    Notes: Global AI chat, quick actions (New Project, Global Search), recent activity, link to **Projects**.

3. **Projects (All Projects Index)**  
    Route: `/projects`  
    Notes: Browse/manage all projects (grid/list, filters, create/import, status badges, bulk actions).

4. **Global Search (Results)**  
    Route: `/search`  
    Notes: Cross‑project results (projects, ledger items, draft hits). Header search/⌘K routes here. Facets and deep links; built as a **page** to avoid rework.

5. **Profile & Account**  
    Route: `/settings/profile`  
    Notes: Name, email, avatar. (Auth wiring later.)

6. **Preferences**  
    Route: `/settings/preferences`  
    Notes: Theme, language, keyboard, editor defaults (non‑project).

7. **Help & Glossary**  
    Route: `/help`  
    Notes: Concise definitions (Evidence Ledger, Locator, Triage Card) \+ short how‑tos.

8. **What’s New / Changelog**  
    Route: `/changelog`  
    Notes: Release notes; linkable entries.

9. **About / Legal**  
    Routes: `/about`, `/legal/terms`, `/legal/privacy`

10. **Notifications**  
     Route: `/notifications`  
     Notes: Canonical history of alerts; a lightweight header panel may exist for quick access.

11. **Runs**  
     Route: `/runs`  
     Notes: Background processes (search/compose/export) with statuses, logs, and **resumable runs**. Header may show a compact live indicator.

12. **Not Found / Error**  
     Routes: `/404` (catch‑all), `/500`

    ---

    ## **Project Workspace (Scoped Pages)**

**Shell/Container**  
 Route: `/project/:id` → redirects to default landing (initial default \= `/project/:id/chat`, configurable later).  
 Notes: Persistent header \+ sidebar within the project scope.

1. **Project Chat**  
    Route: `/project/:id/chat`  
    Notes: AI assistant scoped to this project; can trigger plan/search/triage/compose with deep links.

2. **Research Planning**  
    Route: `/project/:id/planning`  
    Notes: Scope/questions, query strategy (Boolean/MeSH), target sources, initial outline → **Run Search**. Includes a **Templates** section/tab for reusable plans/outlines (kept inside Planning to avoid a separate page).

3. **Search & Triage**  
    Route: `/project/:id/triage`  
    Notes: Triage cards (metadata, study type, integrity flags, OA status, rationale); Keep/Maybe/Exclude; Ask‑AI side panel; batch actions. Integrity filters/columns are first‑class here.

4. **Evidence Ledger**  
    Route: `/project/:id/ledger`  
    Notes: Kept references only; provenance, quotes/locators, integrity notes; add manual reference/import. Right‑side inspector supports citation/locator editing.

5. **Draft (Article Editor)**  
    Route: `/project/:id/draft`  
    Notes: Structured manuscript (IMRaD etc.). Citations from **Evidence Ledger** only; per‑section approvals and rollback. Right‑side inspector for citation/locator editing and suggestions.

6. **Export**  
    Route: `/project/:id/export`  
    Notes: **Page** (long‑term). Formats (DOCX/Markdown, BibTeX), citation style, section scope, **PRISMA Preview tab**, and project export history.

7. **Import References**  
    Route: `/project/:id/import`  
    Notes: Import from files/APIs; mapping/validation; integrity summary. **Page** because this surface grows.

8. **Activity & Undo**  
    Route: `/project/:id/activity`  
    Notes: Timeline of actions (triage keeps/discards, compose runs, exports) with targeted rollback. Includes a **Reproducibility** sub‑section (queries/settings snapshots and links) in v1.

9. **Project Settings**  
    Route: `/project/:id/settings`  
    Notes: Citation style & locator policy defaults, export preferences, project name/description.

   ---

   ## **Overlays (intentionally overlays long‑term)**

* **Command Palette (⌘K)** — no route; quick navigation & actions.

* **Keyboard Shortcuts (modal)** — no route; cheat sheet.

* **Quick Notifications panel** — convenience only; canonical history at `/notifications`.

* **Quick Runs panel** — convenience only; canonical list at `/runs`.

* **Ask‑AI side panel** — contextual within **Triage** and **Project Chat** (not a global modal).

* **Right‑side Inspector** — persistent panel in **Draft** and **Ledger** for citation/locator editing (not a modal).

  ---

  ## **Routing Summary**

* Global: `/login`, `/`, `/projects`, `/search`, `/settings/profile`, `/settings/preferences`, `/help`, `/changelog`, `/about`, `/legal/terms`, `/legal/privacy`, `/notifications`, `/runs`, `/404`, `/500`

* Project: `/project/:id` → default `/project/:id/chat`, plus `/project/:id/planning`, `/project/:id/triage`, `/project/:id/ledger`, `/project/:id/draft`, `/project/:id/export`, `/project/:id/import`, `/project/:id/activity`, `/project/:id/settings`

  ---

  ## **Defaults / Decisions (current)**

* Default project landing: **Project Chat** (configurable per user later).

* **Export is a Page** (stable long‑term; PRISMA inside as a tab).

* **Import References is a Page** (stable long‑term).

* **Templates** live **inside Research Planning** (no separate page).

* **Approvals** live **inside Draft** (no separate review page).

* **Integrity** surfaces primarily in **Triage**/**Ledger** (no separate integrity page).

* **Reproducibility** lives in **Activity & Undo** initially; can graduate later if the “pack” ships.

**Home-specific decisions:**

* **Header search** is a compact, always‑visible input that routes to `/search`.

* **AI Concierge** is a right‑column card on Home (full‑width AI only inside project).

* Show **max 4 project cards** on Home, ordered **Pinned → Ongoing/Needs‑attention → Recent**.

* A separate, prominent **“My Projects”** link/button appears **above** the cards and routes to `/projects`.

* **Import References is NOT shown on Home.** Import occurs per‑project at `/project/:id/import` (optional via ⌘K with project picker).

**Runs meaning & placement:**

* **Runs** \= background processes (search, import parsing, integrity checks, compose runs, exports), **not** a to‑do list.

* Access via the **header Runs icon** and a small **“View all runs → /jobs”** link in the Home right‑column snapshot (no primary “View Jobs” button on Home).

  ## **Change Policy**

* This is a living document that needs to be regularly updated.

