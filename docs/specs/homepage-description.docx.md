# Homepage — Global Hub Spec

## **Purpose**

A calm, focused hub to start work, access the full project library, glance at a small curated set of projects, and ask quick cross-project questions via a compact AI helper.

---

## **Global Layout**

* **Sidebar (persistent, thin, left):** A thin vertical bar showing icons with small labels beneath them. Items are stacked vertically in a single list, with **Help** placed at the very bottom. Sidebar background \= white, subtle shadow on right edge. Tooltips also available on hover.

* **Header (sticky):**

  * **Left:** Logo → Home (`/`)

  * **Center:** Compact search bar with placeholder “Search across the app…”. Shortcut: ⌘K opens command palette.

  * **Right:**

    * **Runs indicator (tiny icon):** unobtrusive; **red counter** \= running, **green counter** \= finished. Click → `/runs`.

    * **Notifications** with count → `/notifications`

    * **Avatar** → Profile, Preferences, Changelog, Legal

* **Top action bar (below header, inside content):** exactly two aligned buttons: **My Projects** (primary) and **New Project** (secondary).

* **Content area (to the right of sidebar):** split into two balanced columns:

  * **Left column (projects)**

  * **Right column (AI Concierge panel)**

---

## **Left Column — Project Cards Grid**

* **Grid:** up to 4 projects, arranged in a **2×2 grid** (two rows × two cards per row).

* **Card anatomy (compact):**

  * **Title** (clickable) → `/project/:id`

  * **Meta line:** `Ledger N · Draft X% · Updated <relative time>`

  * **Status icons (tiny, with tooltips):** Pin, Spinner (running), Check (idle)

  * **Progress bar:** thin, visible only if run active

  * **Hover quick actions (icons):** Open project, Open Draft, Open Ledger

  * **Overflow menu:** Rename · Duplicate · Archive

* **Style:** floating white panels with rounded corners and soft shadow. Compact size leaves generous whitespace for calm balance.

* **Hover:** stronger shadow, slight lift.

* **Empty slots:** hidden. Empty state handled separately.

---

## **Right Column — AI Concierge Panel**

* The entire right column is dedicated to the **AI Concierge**.

* The background is slightly tinted to separate it from projects.

* Inside:

  * Input field at the top with placeholder “Ask about your work across projects…”

  * **Ask** button beside input

  * Link below input: **Open full chat** (routes to project-aware workspace)

  * Space below input for showing quick prompts or recent answers

* Integrated as a **panel**, not a floating card. Aligns top with first row of project cards for symmetry.

---

## **Behavior & States**

* **Empty state:** left column shows centered message: “No projects yet. Create your first project.” \+ **New Project** button. Concierge panel still available with prompts.

* **Loading:** skeletons for 4 cards; search and concierge input remain active.

* **Errors:** inline retry banners per module; runs/notifications issues don’t block page.

---

## **Accessibility & Keyboard**

* Contrast minimum 4.5:1; visible focus rings.

* Card titles \= semantic headings.

* Status icons with descriptive tooltips \+ `aria-label`s.

* Tab order: My Projects → New Project → project cards (row by row) → concierge input.

* Command palette ⌘K global.

---

## **Responsive Rules**

* **Large screens:** 2×2 grid on left; concierge panel on right.

* **Medium screens:** still 2×2 grid; concierge remains in right column.

* **Tablets:** grid 2 per row; sidebar collapses; concierge stacks below grid, tint removed.

* **Mobile:** single column; cards one per row; sidebar overlay drawer; concierge below cards.

---

## **Visual Style**

* Sidebar \= thin, icon \+ small label, white with subtle shadow. Help is always fixed at bottom.

* Left column background \= light neutral, cards float as white blocks with shadow.

* Right column \= slightly tinted background, concierge integrated as panel.

* Cards are compact, leaving visible whitespace for a calm, balanced look.

* Runs indicator small and unobtrusive.

---

## **QA Checklist**

- [ ] Sidebar is thin (icon \+ small label), Help fixed at bottom

- [ ] Header has search \+ runs indicator \+ notifications \+ avatar

- [ ] Top action bar only has My Projects \+ New Project

- [ ] Grid shows max 4 projects (2×2), compact floating cards with whitespace

- [ ] Right column is concierge panel with tinted background, not a card

- [ ] Content alignment respects spacing; nothing crammed at top

- [ ] Empty/Loading/Error states work as described

- [ ] Keyboard order verified; ⌘K palette works  
