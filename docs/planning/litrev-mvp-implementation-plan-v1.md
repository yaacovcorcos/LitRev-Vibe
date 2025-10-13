# LitRev-Vibe MVP Implementation Plan

## Technology Stack

**Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, shadcn/ui

**Backend**: Next.js API routes + tRPC for type-safe APIs

**Database**: PostgreSQL (Supabase/Neon managed)

**AI**: OpenAI GPT-4 (structured output) + Anthropic Claude (long-context analysis)

**Search**: PubMed E-utilities API with adapter pattern for future federation

**Deployment**: Vercel (frontend/API) + managed PostgreSQL

**State Management**: Zustand (client) + React Query (server state)

**UI/UX Libraries**: Framer Motion (animations), Radix UI (accessible primitives via shadcn/ui), Lucide Icons, Inter font family

---

## Design System & UI/UX Philosophy

### Visual Design Principles

1. **Calm & Spacious**: Generous whitespace, breathing room between elements, never cramped
2. **Hierarchy & Clarity**: Clear visual hierarchy using typography scale, color, and spacing
3. **Consistency**: Reusable components, consistent spacing system (4px/8px grid), predictable patterns
4. **Delight**: Subtle animations, smooth transitions, micro-interactions that feel responsive
5. **Professional Medical Grade**: Clean, trustworthy aesthetic appropriate for scientific work

### Design System (Phase 0 - Build First)

**Typography Scale**

- H1: 2.5rem (40px) - Page titles
- H2: 2rem (32px) - Section headers  
- H3: 1.5rem (24px) - Subsection headers
- Body: 1rem (16px) - Primary text
- Small: 0.875rem (14px) - Metadata, captions
- Tiny: 0.75rem (12px) - Labels, badges

**Color System**

- Primary: Indigo/Blue (scientific, trustworthy) - actions, links
- Success: Green - Keep actions, completed states
- Warning: Amber - Maybe/pending states
- Danger: Red - Discard actions, errors
- Neutral: Gray scale (50-950) - backgrounds, borders
- Semantic: Integrity flags (retraction=red, OA=green, predatory=orange)

**Spacing System**

- Container max-width: 1400px
- Section padding: 2rem (32px) minimum
- Card padding: 1.5rem (24px)
- Component gap: 1rem (16px) standard

**Component Library** (shadcn/ui + custom)

- Buttons: primary, secondary, ghost, destructive (with loading, icons)
- Cards: elevated, flat, interactive (hover shadow lift)
- Inputs: text, textarea, select, combobox (error states, icons)
- Badges: status indicators with semantic colors
- Toasts: success, error, info (non-blocking, auto-dismiss)
- Dialogs: consistent header/content/footer
- Skeletons: match actual component shapes
- Progress: linear, circular, with labels
- Tooltips: consistent delay, positioning
- Dropdowns: with icons, keyboard nav
- Tabs: underline (navigation), pill (filters)
- Empty/Error states: icon, message, CTA

**Animation Library** (Framer Motion)

- Page transitions: fade + slide (100ms)
- Card hover: shadow lift + scale (150ms ease-out)
- Button press: scale down (100ms)
- Panel slide-in: from right (200ms ease-out)
- Loading: smooth rotation
- Skeleton: subtle shimmer
- List items: stagger entrance (50ms delay)
- Toasts: slide up + fade

**Layout Patterns**

- Sidebar: 240px fixed, collapsible to 64px
- Header: 64px height, sticky, shadow on scroll
- Content padding: 2rem desktop, 1rem mobile
- Two-column: 60/40 split (content/inspector)
- Grid: responsive (1/2/4 cols)

### Micro-interactions & Feedback

- Hover states on all interactive elements
- Visible focus rings (accessibility)
- Immediate loading feedback (spinner, skeleton)
- Success: green checkmark animation + toast
- Error: red shake animation + inline message
- Optimistic UI updates with rollback
- Smooth transitions between states

### Responsive Strategy

- Desktop-first (primary use case)
- Breakpoints: <640px (mobile), 640-1024px (tablet), 1024px+ (desktop)
- Mobile: sidebar drawer, stacked layouts, cards for tables, touch-friendly (44px min)

### Accessibility (WCAG 2.1 AA)

- Contrast: 4.5:1 text, 3:1 UI
- Keyboard: logical tab order, all actions accessible
- Screen readers: semantic HTML, ARIA labels, live regions
- Focus management: traps in modals, restoration
- Skip links for keyboard users
- Alt text for all images/icons
- Associated labels for all inputs

**Files**: `src/lib/design-system/`, `src/components/ui/`, `tailwind.config.js`, `src/styles/globals.css`

---

## Architecture Principles

1. **Evidence Ledger as Single Source of Truth**: All citations flow through Ledger; PostgreSQL ensures ACID guarantees
2. **Adapter Pattern**: Clean interfaces for Search, Export, and AI providers to enable swapping/adding providers
3. **Resumable Jobs**: All long-running operations (search, compose, export) persist state to DB and can resume after failures
4. **Type Safety**: End-to-end TypeScript with shared types between client/server via tRPC
5. **No Authentication (v1)**: Single-user mode; data stored locally per browser or optional project files

---

## Phase 1: Foundation & Core Data Models

### Database Schema

- **projects** table: id, name, description, created_at, updated_at, settings (JSON)
- **research_plans** table: project_id, scope, questions (JSON), query_strategy (JSON), outline (JSON), status
- **candidates** table: project_id, external_id (PubMed ID), metadata (JSON), triage_status (pending/kept/discarded), ai_rationale, integrity_flags (JSON), created_at
- **evidence_ledger** table: project_id, reference_id, metadata (JSON), provenance (JSON), quotes (JSON array with locators), integrity_notes, kept_at
- **draft_sections** table: project_id, section_type (intro/methods/results/discussion/conclusion/lit_review), content (rich text JSON), citations (JSON array), version, status
- **jobs** table: project_id, job_type, status (queued/running/completed/failed), progress, logs (JSON), resumable_state (JSON), created_at, updated_at

### Key Entities & Types

Create TypeScript interfaces for:

- `ResearchPlan` (scope, questions, query strategy, outline)
- `TriageCard` (candidate article with metadata, rationale, recommendation)
- `LedgerEntry` (accepted reference with provenance and locators)
- `Citation` (inline citation with locator: page/paragraph/sentence)
- `DraftSection` (section content with embedded citations)
- `Job` (background task with resumable state)

### Infrastructure Setup

- Initialize Next.js 14 project with TypeScript, ESLint, Prettier
- Set up PostgreSQL schema with Prisma ORM
- Configure environment variables for API keys (OpenAI, Anthropic, PubMed)
- Set up tRPC for type-safe API routes
- Implement basic error handling and logging middleware

**Files**: `prisma/schema.prisma`, `src/types/`, `src/server/trpc.ts`, `next.config.js`

---

## Phase 2: UI Shell & Navigation

### Global Layout

- Persistent sidebar (icons + labels): Home, Projects, Search, Help (bottom)
- Sticky header: Logo, search bar (⌘K), notifications icon, avatar dropdown
- Routing structure matching Pages List spec
- Command palette (⌘K) with fuzzy search across routes and actions

### Homepage (`/`)

- Two-column layout: left (2×2 project cards grid), right (AI Concierge panel)
- Project cards: title, meta line (ledger count, draft %, updated time), status icons, hover quick actions
- AI Concierge: input field, "Ask" button, link to full chat
- "My Projects" + "New Project" buttons above grid
- Empty state: "No projects yet" message

### Project Workspace Shell (`/project/:id`)

- Persistent project-scoped header + sidebar
- Routes: `/chat`, `/planning`, `/triage`, `/ledger`, `/draft`, `/export`, `/import`, `/activity`, `/settings`
- Default landing: `/project/:id/chat`

### Other Global Pages

- `/projects`: All projects index (grid/list view, filters, create/import)
- `/search`: Global search results (placeholder for v1)
- `/settings/preferences`: Theme, editor defaults
- `/help`: Glossary and how-tos
- `/changelog`, `/about`, `/legal/*`: Static content pages
- `/notifications`, `/runs`: List views with status badges

**Files**: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/project/[id]/layout.tsx`, `src/components/Sidebar.tsx`, `src/components/Header.tsx`, `src/components/CommandPalette.tsx`

---

## Phase 3: Research Planning Module

### Planning Page (`/project/:id/planning`)

- Form to input research question or user findings
- AI-generated scope (PICO framework), key questions, query strategy (Boolean/MeSH), target sources
- Initial article outline (IMRaD structure)
- Edit mode: all AI outputs editable before execution
- "Run Search" button triggers search job
- Templates section (tab or accordion) for reusable plans

### AI Planning Engine

- Prompt engineering for scope/questions extraction (GPT-4 structured output)
- Query strategy generation (Boolean operators, MeSH term suggestions)
- Outline generation based on research type (systematic review, narrative review, meta-analysis)
- Save plan to `research_plans` table with status tracking

### Planning Service Layer

- `PlanningService.generatePlan(question: string, findings?: string): Promise<ResearchPlan>`
- `PlanningService.savePlan(projectId: string, plan: ResearchPlan): Promise<void>`
- `PlanningService.updatePlan(planId: string, updates: Partial<ResearchPlan>): Promise<void>`

**Files**: `src/app/project/[id]/planning/page.tsx`, `src/server/services/PlanningService.ts`, `src/lib/ai/planning-prompts.ts`

---

## Phase 4: Search Adapter & PubMed Integration

### Search Adapter Interface

```typescript
interface SearchAdapter {
  search(query: SearchQuery): Promise<SearchResult[]>
  fetchDetails(id: string): Promise<Article>
  getIntegrityFlags(article: Article): Promise<IntegrityFlags>
}
```

### PubMed Adapter Implementation

- E-utilities API integration (ESearch + EFetch)
- Parse PubMed XML to normalized `Article` metadata
- Extract: PMID, title, authors, journal, year, abstract, DOI, MeSH terms, publication types
- Rate limiting and error handling (PubMed API limits)
- Integrity checks: Retraction status (via PubMed metadata), basic journal watchlist (predatory journal list)

### Search Service

- `SearchService.executeSearch(plan: ResearchPlan, adapter: SearchAdapter): Promise<Job>`
- Creates `Job` entry in database with status "running"
- Fetches results in batches, stores as `candidates` with status "pending"
- Handles API failures gracefully, stores resumable state
- Updates job progress and logs

**Files**: `src/server/adapters/SearchAdapter.ts`, `src/server/adapters/PubMedAdapter.ts`, `src/server/services/SearchService.ts`, `src/lib/pubmed.ts`

---

## Phase 5: AI Research Assistant (Triage)

### Triage Page (`/project/:id/triage`)

- Grid/list view of triage cards (candidates from search)
- Card anatomy: title, authors, journal, year, abstract snippet, study type, integrity flags (icons + tooltips), OA status
- AI rationale (brief explanation of relevance), AI recommendation (Keep/Maybe/Exclude)
- Actions per card: Keep, Discard, Ask AI (side panel)
- Batch actions toolbar: Keep selected, Discard selected, Apply AI recommendations
- Filters: recommendation, integrity flags, study type, publication year

### AI Triage Engine

- Prompt Claude with research plan + article metadata/abstract
- Generate relevance rationale (2-3 sentences)
- Provide recommendation (Keep/Maybe/Exclude) with confidence score
- Batch processing: queue triage for all candidates, process in parallel with rate limits

### Ask-AI Side Panel

- Context: selected article + research questions
- User question input
- AI response: structured answer with direct quotes from abstract/full-text (if available) + locators
- Uses Claude long-context for deep article analysis

### Triage Service

- `TriageService.generateRationale(candidate: Candidate, plan: ResearchPlan): Promise<TriageRationale>`
- `TriageService.keepCandidate(candidateId: string): Promise<LedgerEntry>` — moves to Evidence Ledger
- `TriageService.discardCandidate(candidateId: string, reason?: string): Promise<void>`
- `TriageService.askAI(candidateId: string, question: string): Promise<AIAnswer>`

**Files**: `src/app/project/[id]/triage/page.tsx`, `src/components/TriageCard.tsx`, `src/components/AskAIPanel.tsx`, `src/server/services/TriageService.ts`, `src/lib/ai/triage-prompts.ts`

---

## Phase 6: Evidence Ledger

### Ledger Page (`/project/:id/ledger`)

- Table/grid of kept references only
- Columns: Title, Authors, Year, Journal, Integrity status, Added date
- Search/filter by metadata, integrity flags
- Row actions: View details, Edit locators, Remove (with confirmation)
- "Add Manual Reference" button (form for direct entry)
- Right-side inspector panel: full metadata, provenance (how it entered), quotes/locators editor

### Ledger Inspector Panel

- Display full reference metadata (editable)
- Provenance timeline: search query used, date kept, user decision
- Quotes & Locators section: list of extracted/added quotes with page/paragraph/sentence locators
- Add/edit/delete quotes manually
- Integrity notes (retraction status, journal flags)

### Ledger Service

- `LedgerService.getEntries(projectId: string): Promise<LedgerEntry[]>`
- `LedgerService.addManualEntry(projectId: string, metadata: ReferenceMetadata): Promise<LedgerEntry>`
- `LedgerService.updateEntry(entryId: string, updates: Partial<LedgerEntry>): Promise<void>`
- `LedgerService.removeEntry(entryId: string): Promise<void>` — soft delete with audit trail
- `LedgerService.addQuote(entryId: string, quote: Quote): Promise<void>`

### Import References Feature (`/project/:id/import`)

- File upload (BibTeX, RIS placeholder for v1)
- Parse and map to normalized metadata
- Preview imported references before adding to Ledger
- Validation and duplicate detection
- Batch import with progress indicator

**Files**: `src/app/project/[id]/ledger/page.tsx`, `src/components/LedgerInspector.tsx`, `src/app/project/[id]/import/page.tsx`, `src/server/services/LedgerService.ts`, `src/lib/importers/bibtex.ts`

---

## Phase 7: AI Compose Engine (Core)

### Compose Service Architecture

- **Input**: Research plan, Evidence Ledger entries, user findings (optional), section type
- **Output**: Draft section with inline citations (each with locators)
- **Constraint**: Only cite sources present in Evidence Ledger

### Citation Locator System

- Citation format: `[Author Year:locator]` e.g., `[Smith 2020:p.42]`, `[Jones 2019:para.3]`, `[Lee 2021:sent.5]`
- Locator extraction: AI identifies relevant quotes from full-text/abstracts and assigns page/paragraph/sentence
- Validation: Ensure every citation maps to a Ledger entry; reject if not found

### Compose Prompts (Claude)

- **Literature Review**: Given research questions + Ledger entries, generate structured review with subsections (background, findings, gaps)
- **Introduction**: Given scope + key questions, generate intro with context and rationale (cite background literature)
- **Methods**: Describe search strategy, inclusion/exclusion, triage process (from plan metadata)
- **Results**: Summarize findings from Ledger (descriptive synthesis)
- **Discussion**: Interpret findings, compare with existing literature, limitations
- **Conclusion**: Summarize key takeaways and implications

### Compose Service

- `ComposeService.generateSection(projectId: string, sectionType: SectionType, options?: ComposeOptions): Promise<Job>`
- Validates Ledger has sufficient entries for section
- Calls AI with Ledger context + prompts
- Parses AI output, extracts citations, validates against Ledger
- Stores draft section in `draft_sections` table
- Supports resumable jobs (if AI call fails mid-generation)

### Citation Validation

- `CitationValidator.validate(content: string, ledger: LedgerEntry[]): ValidationResult`
- Checks every inline citation exists in Ledger
- Flags missing locators or invalid formats
- Suggests fixes (find closest matching entry)

**Files**: `src/server/services/ComposeService.ts`, `src/lib/ai/compose-prompts.ts`, `src/lib/citations/validator.ts`, `src/lib/citations/parser.ts`

---

## Phase 8: Draft Editor & Workspace

### Draft Page (`/project/:id/draft`)

- Structured editor with sections: Introduction, Literature Review, Methods, Results, Discussion, Conclusion
- Each section: collapsible panel with status badge (empty, draft, approved)
- Rich text editor (Tiptap or Lexical) with citation support
- Inline citation UI: hover shows reference details, click opens Ledger inspector
- Per-section actions: AI Compose, Edit manually, Approve, Rollback to previous version
- Right-side inspector: citation details, locator editor, suggested additional citations

### Citation Editor Integration

- Insert citation command (⌘Shift+C): search Ledger, select entry, add locator
- Citation autocomplete: type `[@` to search Ledger
- Locator picker: dropdown for page/paragraph/sentence format
- Visual citation highlights (color-coded by source or validity)

### Version Control & Rollback

- Auto-save drafts every 30 seconds
- Version history per section (snapshots on Approve or manual save)
- Rollback UI: timeline view, diff viewer, restore button
- Undo/redo stack for manual edits

### Draft Service

- `DraftService.getSections(projectId: string): Promise<DraftSection[]>`
- `DraftService.updateSection(sectionId: string, content: RichText): Promise<void>`
- `DraftService.approveSection(sectionId: string): Promise<void>` — locks version
- `DraftService.rollbackSection(sectionId: string, versionId: string): Promise<void>`

**Files**: `src/app/project/[id]/draft/page.tsx`, `src/components/DraftEditor.tsx`, `src/components/CitationInserter.tsx`, `src/components/DraftInspector.tsx`, `src/server/services/DraftService.ts`

---

## Phase 9: Export Engine

### Export Page (`/project/:id/export`)

- Format selection: DOCX, Markdown, BibTeX (bibliography only)
- Citation style picker: APA, Vancouver, Chicago, etc. (use Citation Style Language - CSL)
- Section scope: All sections, Selected sections only
- PRISMA diagram tab: auto-generated flow diagram (search → screening → included)
- Export history: list of previous exports with download links
- "Generate Export" button → creates job, shows progress

### Export Adapters

```typescript
interface ExportAdapter {
  export(draft: DraftSection[], ledger: LedgerEntry[], options: ExportOptions): Promise<Buffer>
}
```

### DOCX Adapter

- Use `docx` library to generate Word documents
- Apply citation style using `citeproc-js` (CSL processor)
- Format sections with proper headings (IMRaD structure)
- Inline citations → footnotes or in-text (based on style)
- References section: alphabetical or numbered list

### Markdown Adapter

- Simple markdown output with inline citations as links
- YAML frontmatter with metadata (title, authors, date)
- References as footnotes or end list

### BibTeX Adapter

- Export Ledger entries only
- Normalize to BibTeX format (@article, @book, etc.)
- Include all metadata fields (DOI, PMID, abstract)

### PRISMA Diagram Generator

- Calculate flow numbers: records identified, screened, included, excluded (from jobs + triage data)
- Generate SVG/PNG using diagram library (Mermaid or D3.js)
- Embed in DOCX exports or standalone file

### Export Service

- `ExportService.generateExport(projectId: string, format: ExportFormat, options: ExportOptions): Promise<Job>`
- Creates job, runs adapter, stores output as blob/file
- Supports resumable exports (if large documents timeout)
- Logs export history in database

**Files**: `src/app/project/[id]/export/page.tsx`, `src/server/adapters/ExportAdapter.ts`, `src/server/adapters/DOCXAdapter.ts`, `src/server/adapters/MarkdownAdapter.ts`, `src/server/adapters/BibTeXAdapter.ts`, `src/lib/prisma-diagram.ts`, `src/server/services/ExportService.ts`

---

## Phase 10: Jobs & Background Processing

### Jobs/Runs System

- All long-running operations (search, triage, compose, export) create `Job` entries
- Job statuses: queued, running, completed, failed, cancelled
- Resumable state: store progress + intermediate data in `resumable_state` JSON field
- Retry logic: exponential backoff for API failures
- Cancellation: user can cancel running jobs (graceful shutdown)

### Runs Page (`/runs`)

- List all jobs across projects (filterable by project, type, status)
- Job card: type icon, project name, status badge, progress bar, timestamps
- Actions: View logs, Resume (if failed), Cancel, Delete
- Real-time updates via polling or WebSockets (optional)

### Job Service

- `JobService.createJob(projectId: string, jobType: JobType, payload: any): Promise<Job>`
- `JobService.updateProgress(jobId: string, progress: number, logs: string[]): Promise<void>`
- `JobService.completeJob(jobId: string, result: any): Promise<void>`
- `JobService.failJob(jobId: string, error: Error): Promise<void>`
- `JobService.resumeJob(jobId: string): Promise<void>` — restore state and continue

### Background Processing

- Use Vercel serverless functions with max timeout (10s free, 60s+ pro)
- For longer jobs: implement chunking (process in batches, store state between invocations)
- Alternative: BullMQ + Redis for true background jobs (if needed for scale)

**Files**: `src/app/runs/page.tsx`, `src/components/JobCard.tsx`, `src/server/services/JobService.ts`, `src/lib/jobs/processor.ts`

---

## Phase 11: Project Chat & AI Concierge

### Project Chat (`/project/:id/chat`)

- Full-width chat interface scoped to project
- AI assistant with access to: research plan, Ledger, draft sections, jobs
- Capabilities: answer questions, trigger actions (run search, triage, compose), explain decisions
- Context-aware: knows project state, can reference specific Ledger entries or draft sections
- Deep links: AI can suggest "Go to Triage" or "View Ledger entry #42"

### AI Concierge (Homepage)

- Lighter version: cross-project questions, quick starts
- "Create new project from question", "Show recent activity", "Explain Evidence Ledger"
- Routes to project chat for deeper interactions

### Chat Service

- `ChatService.sendMessage(projectId: string, message: string): Promise<ChatResponse>`
- Builds context from project data (plan, ledger count, draft status, recent jobs)
- Routes to appropriate AI model (GPT-4 for structured, Claude for analysis)
- Parses AI responses for action triggers (e.g., "Let me run a search for you")

**Files**: `src/app/project/[id]/chat/page.tsx`, `src/app/page.tsx` (concierge), `src/components/ChatInterface.tsx`, `src/server/services/ChatService.ts`, `src/lib/ai/chat-prompts.ts`

---

## Phase 12: Activity Timeline & Reproducibility

### Activity Page (`/project/:id/activity`)

- Timeline of all project actions: plan created, search run, articles triaged (Keep/Discard), sections composed, exports generated
- Each entry: timestamp, user (placeholder "You" for v1), action type, details
- Targeted rollback: undo specific actions (e.g., "Undo bulk discard of 15 articles")
- Reproducibility section: queries used, settings snapshot, links to relevant jobs

### Reproducibility Pack (v1)

- Display search queries (Boolean strings, date ranges, sources)
- List of settings used (citation style, inclusion criteria from plan)
- Link to export downloads and job logs
- Future: downloadable bundle (zip with queries, ledger export, settings JSON)

### Activity Service

- `ActivityService.logAction(projectId: string, action: Action): Promise<void>`
- `ActivityService.getTimeline(projectId: string): Promise<TimelineEntry[]>`
- `ActivityService.rollbackAction(actionId: string): Promise<void>` — reverses specific action (delete Ledger entries, restore candidates, revert draft)

**Files**: `src/app/project/[id]/activity/page.tsx`, `src/components/ActivityTimeline.tsx`, `src/server/services/ActivityService.ts`

---

## Phase 13: Settings & Preferences

### Project Settings (`/project/:id/settings`)

- Project name and description (editable)
- Default citation style (dropdown: APA, Vancouver, etc.)
- Locator policy: strict (all citations must have locators) vs. flexible (optional)
- Export preferences: default format, include PRISMA diagram
- Danger zone: Export project data (JSON), Delete project

### Global Preferences (`/settings/preferences`)

- Theme: Light, Dark, System
- Editor defaults: font size, line spacing, spell check
- Keyboard shortcuts (view/customize)
- Language (English only for v1, framework for i18n later)

### Settings Service

- `SettingsService.updateProjectSettings(projectId: string, settings: ProjectSettings): Promise<void>`
- `SettingsService.getGlobalPreferences(): Promise<Preferences>` — stored in localStorage for v1 (no auth)
- `SettingsService.updateGlobalPreferences(preferences: Preferences): Promise<void>`

**Files**: `src/app/project/[id]/settings/page.tsx`, `src/app/settings/preferences/page.tsx`, `src/server/services/SettingsService.ts`

---

## Phase 14: Polish, Testing & Deployment

### UI/UX Polish

- Accessibility audit: keyboard navigation, ARIA labels, contrast ratios (WCAG AA)
- Loading states: skeletons, spinners, progress bars (consistent patterns)
- Error states: friendly messages, retry buttons, support links
- Empty states: helpful prompts, call-to-action buttons
- Responsive design: test mobile, tablet, desktop breakpoints
- Animations: subtle transitions (page loads, card hovers, panel slides)

### Error Handling & Resilience

- Global error boundary with fallback UI
- API error handling: retry logic, user-facing messages
- Validation: client-side (instant feedback) + server-side (security)
- Rate limiting: graceful degradation when API limits hit
- Offline support: service worker for static assets (optional)

### Testing Strategy

- Unit tests: services, adapters, utilities (Vitest)
- Integration tests: API routes, database queries (Vitest + testcontainers for PostgreSQL)
- E2E tests: critical flows (Playwright) — create project → plan → search → triage → compose → export
- Visual regression: Chromatic or Percy (optional)
- Load testing: search/compose endpoints with mock AI responses

### Documentation

- `README.md`: project overview, setup instructions, architecture diagram
- `CONTRIBUTING.md`: how to add new adapters (search/export), coding standards
- `DECISIONS.md`: ADR-lite (why Next.js, why PostgreSQL, why tRPC)
- `FILE_INDEX.md`: auto-generated file tree with descriptions
- `JOURNAL.md`: session log template
- `GLOSSARY.md`: terms from spec (Evidence Ledger, Locator, etc.)
- API documentation: tRPC auto-generates types, add JSDoc comments

### Deployment Checklist

- Environment variables: secure storage (Vercel env vars)
- Database migrations: run Prisma migrate in CI/CD
- Error monitoring: Sentry or similar (capture client + server errors)
- Analytics: privacy-first (Plausible or Fathom, optional)
- Performance monitoring: Vercel Analytics, Core Web Vitals
- Backup strategy: automated PostgreSQL backups (managed DB provider handles)
- Security headers: CSP, HSTS, X-Frame-Options (next.config.js)

### Launch Preparation

- Staging environment: full copy of production for testing
- Smoke tests: verify all routes load, critical flows work
- Rollback plan: keep previous deployment available
- Monitoring dashboard: job queue health, API success rates, DB performance
- Support documentation: user guide (Help page), troubleshooting FAQ

**Files**: `README.md`, `CONTRIBUTING.md`, `DECISIONS.md`, `FILE_INDEX.md`, `JOURNAL.md`, `GLOSSARY.md`, `tests/`, `playwright.config.ts`, `.github/workflows/ci.yml`

---

## Implementation Order & Milestones

### Milestone 1: Foundation (Weeks 1-2)

- Database schema + Prisma setup
- Next.js project structure + routing shell
- Global layout (sidebar, header, command palette)
- Homepage with placeholder project cards
- Basic tRPC setup

### Milestone 2: Core Modules (Weeks 3-5)

- Research Planning page + AI planning engine
- PubMed adapter + Search service
- Triage page + AI triage engine
- Evidence Ledger page + inspector

### Milestone 3: Composition Engine (Weeks 6-7)

- AI Compose service + citation validation
- Draft editor with rich text + citation support
- Version control + rollback

### Milestone 4: Export & Jobs (Week 8)

- Export adapters (DOCX, Markdown, BibTeX)
- PRISMA diagram generator
- Jobs system + Runs page

### Milestone 5: Finishing Touches (Weeks 9-10)

- Project Chat + AI Concierge
- Activity timeline + reproducibility
- Settings pages
- Import references feature

### Milestone 6: Polish & Launch (Weeks 11-12)

- UI/UX polish + accessibility
- Testing (unit, integration, E2E)
- Documentation
- Deployment + monitoring setup

**Total estimated timeline: 12 weeks for production-ready MVP**

---

## Success Criteria

✅ **End-to-end automated flow works**: Topic → Research Plan → Search (PubMed) → AI Triage → Keep to Ledger → AI Compose (all sections) → Export (DOCX with citations + PRISMA diagram)

✅ **Evidence Ledger integrity**: No citation in draft without corresponding Ledger entry; all citations have locators

✅ **Resumable operations**: Any job (search, compose, export) can be interrupted and resumed without data loss

✅ **Manual override anywhere**: User can edit AI outputs, manually triage, write sections, add citations

✅ **Clean architecture**: Adapter interfaces for Search/Export/AI allow adding new providers with <100 LOC

✅ **Production quality**: Accessible (WCAG AA), responsive, error-handled, monitored, documented

✅ **Scalable foundation**: TypeScript types, database schema, API structure support adding auth, collaboration, meta-analysis later without refactoring core

---

## Post-MVP Roadmap Hooks

The architecture supports adding (without major refactoring):

- **Authentication**: Add Clerk/Supabase Auth, migrate localStorage preferences to user DB records
- **Collaboration**: Add user_id to all tables, implement RBAC, real-time co-editing via Yjs/Liveblocks
- **Search Federation**: Add Crossref/OpenAlex adapters (same interface as PubMed)
- **Advanced Appraisal**: Add RoB/GRADE tables (new tables, link to Ledger entries)
- **Meta-Analysis**: New module, reads from Ledger, generates forest plots/funnel plots
- **Explorer Draft**: Parallel draft table, selective import UI
- **Full-text Harvesting**: OA full-text fetcher, enhanced Ask-AI with full-text context
