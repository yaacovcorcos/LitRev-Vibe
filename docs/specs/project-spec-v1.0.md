# Product Specification Document \- Parent App

*An AI powered, automated medical literature review and article writing platform* 

# **Executive Overview**

A medical-grade platform for medical scientists to plan the research, review the literature, and write complete medical articles. From a research question and/or user findings, the system structures a research plan (scope, key questions, search strategy and sources) and then searches scholarly databases, triages evidence into an Evidence Ledger, and composes a full manuscript, introduction, literature review, methods, results, discussion, and conclusion, with inline citations, a reference list, and a PRISMA-style diagram. Work can be done manually, AI-assisted, or fully automated. Core principle: no claim without a source (each substantive statement cites a specific source with a locator such as page/paragraph/sentence). The Evidence Ledger is the architectural keystone—the immutable source of truth that all modules read from and write to.

# **Summary of Main Features**

* Research planning (turn a question/findings into scope, key questions, query strategy, target sources, and initial outline).

* Literature review engine (automated or guided) with PRISMA-style output.

* Article drafting workspace (manual, AI-assisted, or fully automated).

* Evidence Ledger (vetted references with provenance and locators).

* AI Research Assistant (search & triage with rationale and recommendations).

* Authoring & AI Compose (generates literature review sections and other article sections; optional human approvals).

* Imports & Exports (manuscript, bibliography, PRISMA-style diagram, ledger export).

# **Index**

### **Part I — Vision & Capabilities**

Executive Overview

1. Vision & Scope

2. Core Principles

3. Capabilities (Parent Version)  
    3.1 AI Research Assistant (Search & Triage)  
    3.2 Evidence Ledger  
    3.3 Authoring & AI Compose (Ledger-based)  
    3.4 Imports & Exports

### **Part II — Behavior & Criteria**

4. User Journeys (High-Level)

5. Evidence & Citation Policy 

6. Acceptance Criteria (High-Level, Non-numeric)

7. Deliverables (Per Project)

### **Part III — Project Governance & Roadmap**

8. Documentation & Governance (Repository-level)

9. Roadmap — Descendant (Future Features)

10. Appendix — Glossary

---

# **Part I — Vision & Capabilities**

## **1\) Vision & Scope**

**Parent Version (initial release):**

A workspace where scientists can manage references, conduct a literature review, draft text, and export manuscripts—manually or with AI help.

Research planning formalizes scope (e.g., PICO/variants), proposes query strategies and target sources, and can generate an initial article outline to guide downstream steps.

Literature review engine and Evidence Ledger as the foundation. In Parent, the literature review is the primary automated pathway; other sections can be authored manually or AI-assisted using user findings.

Authoring & AI Compose (ledger-based): generates literature review sections and can extend to other sections using vetted evidence and user findings; human approvals are optional (per step, per section, or final).

From the first release, the platform can generate a complete medical article, with structured sections, inline citations, references, and a PRISMA-style diagram.

Features not included in the Parent release but planned for later appear in §9 Roadmap — Descendant.

**Descendant (future flagship):**

Expands discovery, appraisal, collaboration, and analytics; adds a full meta-analysis engine and broader journal compliance features.

**Primary user profiles (for engineering focus):**

* **Guided Scientist:** mixes manual steps with AI assist within the guided flow.  
  Implication: prioritize responsive UI, fine‑grained state, fast feedback on triage/compose, and clear affordances for stepping in/out of automation.

* **Automated Scientist:** prefers end-to-end automation with minimal intervention.  
  Implication: prioritize backend reliability/performance, robust logging, resumable jobs, and clear progress/health indicators.

  **Architectural Philosophy:** The platform is conceived as a modular monolith, structured around well-defined component boundaries. Each major function—Evidence Ledger, Search & Triage, Authoring & Compose—operates as a distinct module with clear interfaces. This ensures testability, auditability, and room for future evolution into distributed services if required.

## **2\) Core Principles**

* Workspace for scientists: The platform is a comfortable environment for writing an article, regardless of how much automation is used.

* Automation by choice: The user can let AI run end-to-end or insert approval points anywhere; manual and automated steps intermix seamlessly.

* Evidence-based claims: Every substantive statement requires a cited source with a locator (page/paragraph/sentence).

* Clarity & control over complexity: Powerful features remain transparent, observable, interruptible, and reversible.

* Auditability: Every imported or generated artifact is traceable to inputs and decisions.

* User control: Humans can override AI at any time.

* Modular architecture: Components communicate through well‑defined interfaces, enabling independent development and testing of the Evidence Ledger, Search & Triage, and Compose modules.

## **3\) Capabilities (Parent Version)**

### 3.0 Research Planning

From a question or findings, the platform produces:

* Scope & questions (optionally PICO-like framing)

* Query strategy (Boolean strings, synonyms/MeSH, target sources)

* Initial outline for the article/literature review

  The plan can be edited manually or executed automatically to feed AI Research Assistant.

  ### 3.1 AI Research Assistant (Search & Triage)

  Executes the query strategy from Research Planning (or user input), retrieves candidate articles, and presents them as Triage Cards.

  Results appear as Triage Cards showing: metadata, study type, integrity flags (e.g., retraction/predatory indicators), OA status, relevance rationale (brief explanation), AI recommendation (Keep/Maybe/Exclude), and an Ask-AI action.

  Manual or automated triage: scientists can Keep/Discard manually, use AI recommendations, or batch actions; nothing enters the Ledger without an explicit Keep.

  Ask-AI returns structured, evidence-bound answers with quotes \+ locators.

  Integrity flags include known retraction status, journal/publisher integrity watchlist signals, and citation anomalies (e.g., unusual self-citation clusters or paper-mill indicators).

  ### 3.2 Evidence Ledger

  The single source of truth for accepted references.

  Stores normalized metadata, provenance, integrity notes, links to quotes/locators, and human/AI rationale as needed.

  Only Kept items appear here.

  ### 3.3 Authoring & AI Compose (Ledger-based)

  Generates literature review sections and can compose other sections of a complete medical article using Evidence Ledger items and user-provided findings.

* No claim without a source: every substantive statement includes at least one inline citation (see Policy for locator requirements).

* Approvals are optional (full automatic compose, per-section approval, or final review).

* Manual and AI text coexist seamlessly in the same editor.

* Optionally proposes additional citations; proposed items enter as Candidates and must be Kept before they can support text.

  ### 3.4 Imports & Exports

* **Imports:** scholarly database outputs and bibliography extraction sufficient to populate Candidates and the Evidence Ledger. Manual reference entry is also supported.

* **Exports (Parent):** manuscript (DOCX/Markdown), bibliography (BibTeX), PRISMA-style diagram, and an evidence ledger export. Additional formats (e.g., LaTeX, EndNote) are part of the Roadmap. Exports use a pluggable Export Adapter interface to enable additional formats later (see Roadmap).

---

# **Part II — Behavior & Criteria**

## **4\) User Journeys (High-Level)**

Guided flow (default): The experience begins with Research Planning (scope, query strategy, outline), which can be accepted as-is or edited before search runs. Users are then guided through search & triage, composing, and exporting. At every step, they may act manually, use AI support, or let automation run. Guidance can remain unobtrusive if preferred. Scientists may start from their own findings; the composer integrates them with vetted references.

**Core Flow States**  
Planning → Searching → Triaging → Composing → Exporting

**State transitions**  
Each step emits structured outputs (plan, candidates, ledger items, draft) consumed by the next step.

**Rollback**  
Users can return to any prior state (e.g., undo bulk triage, revert a draft section) and resume jobs without data loss.

**Resilience requirements:**  
The system must handle partial failures gracefully. If external search APIs fail, users should still be able to work with existing Evidence Ledger items, compose sections manually, and continue progressing through the workflow without data loss.

**Callouts:**

* Automatic run: Topic → Automated search/triage/keep policy → Full compose → Export (user may intervene at any time).

* Section approval: Topic → Search/triage → Compose section → Approve section → Repeat → Export.

* Correction & recovery: Users can undo or roll back critical actions (e.g., bulk discards, mistaken Keeps, draft overwrites) and resume interrupted jobs.

## **5\) Evidence & Citation Policy**

Every substantive statement in system-generated text must cite at least one vetted source with a locator (page/paragraph/sentence).

Manual drafting is equally supported: users may insert citations and locators themselves; the system enforces consistency with inline citations.

Non-literature content (e.g., the authors’ own methods or results) does not require literature citations but must maintain internal consistency and proper attribution whenever external claims are referenced.

Integrity signals (e.g., retractions/predatory sources) are surfaced; inclusion decisions remain with the user.

Contradictory findings should be signposted when detected (no numeric thresholds required at this stage).

**Reproducibility:** searches, decisions, and compose actions are recorded to enable audit and reproduction.

## **6\) Acceptance Criteria (High-Level, Non-numeric)**

* The system can run end-to-end automatically or with optional human approvals at any step.

* Research planning: Given a question or findings, the system can produce an editable plan (scope, query strategy, target sources, and initial outline) that can be executed automatically.

* Search & Triage produces candidate articles as Triage Cards that include a brief rationale and an AI recommendation, and supports Ask-AI answers with quotes \+ locators.

* Evidence Ledger contains only accepted items; nothing bypasses it.

* **Ledger boundary:** Nothing imported or generated may cite sources that have not been Kept in the Evidence Ledger. Exception: The author’s own findings/methods may be authored directly (clearly distinguished from literature claims) and do not require literature citations.

* The system can produce a complete literature review for a given topic, with inline citations, references, and a PRISMA-style diagram where applicable.

* The system can produce a complete medical article that integrates the literature review with other sections when user findings and inputs are provided.

* **Recovery:** Users can undo critical actions (bulk triage operations, draft overwrites) and resume interrupted jobs without data loss.

* Exports produce a manuscript, bibliography, PRISMA-style diagram, and a ledger export that reflect the current project state.

* **Documentation criteria:** JOURNAL.md, DECISIONS.md, FILE\_INDEX.md must exist and be updated with project changes.

## **7\) Deliverables (Per Project)**

* Complete Literature Review (AI-generated, manually written, or hybrid), with structured sections, inline citations, references, and PRISMA-style diagram.

* Complete Medical Article (AI-generated, manually written, or hybrid), integrating the literature review with other sections (introduction, methods, results, discussion, conclusion).

* Evidence Ledger (accepted references with provenance and locators).

* Exports (manuscript, bibliography, PRISMA-style diagram, ledger data).

* Reproducibility information (high-level description of queries and settings used).

---

# **Part III — Project Governance & Roadmap**

## **8\) Documentation & Governance (Repository-level, code-agnostic)**

* **PROJECT\_SPEC.md** — this document: project description, scope, capabilities, and policies.

* **JOURNAL.md** — a running log of meaningful working sessions capturing progress and changes (who did what, when, and why).

* **DECISIONS.md** — a concise record of important project decisions and their consequences (ADR-lite).

* **FILE\_INDEX.md** — a living index of files/folders in the repository with one-line descriptions so engineers can navigate quickly.

* **CHANGELOG.md** — milestone-level changes over time (added/changed/fixed at release boundaries).

* **CONTRIBUTING.md** — expectations for keeping documentation current when behavior changes.

* **GLOSSARY.md** — definitions of key terms (e.g., Evidence Ledger, Locator, Triage Card, Explorer Draft).

  Note: These documents define our workflow and must be maintained as part of every meaningful change. They describe what is built and changed without prescribing technology choices or implementation details.


  

## ***9\) Roadmap — Descendant App (Future Features)***

### Discovery & Agents

* Federated discovery: PubMed, Crossref, OpenAlex, ClinicalTrials.gov, Europe PMC, and others.

* Parallel Scout: a sandboxed agent that proposes additional leads; outputs arrive as Candidates (never bypassing Ledger).

  ### Appraisal & Analysis

* Advanced appraisal: dual-screening, inter-rater metrics, full frameworks (RoB 2, ROBINS-I, QUADAS-2) and GRADE profiles.

* Meta-analysis engine: full module for conducting meta-analyses, including statistical calculations, pooling of effect sizes, and deeper per-article analytical tools.

  ### Collaboration & Access

* Real-time co-editing, comments, RBAC, organization workspaces, SSO/SCIM.

  ### Composer & Drafting

* Explorer Draft: parallel, unverified narrative for comparison and selective import into the main draft.

* Argument/contradiction surfacing across sources; synthesis helpers.

* Multi-document summarization with per-finding provenance views.

  ### Analytics & Reproducibility

* Reproducibility pack: downloadable bundle of queries, versions, and key artifacts.

* Orchestrated pipelines with resumable steps and audit trails.

  ### Imports & Exports

* Additional imports: RIS/EndNote XML; full-text OA harvesting.

* Additional exports: LaTeX, EndNote, appraisal tables, meta-analysis figures, cover letter/highlights.  
  Note: LaTeX/EndNote require non-trivial templating/mapping; the Parent’s Export Adapter interface allows adding these with low risk later.

  ### Compliance & Integrity

* Entitlement checks per publisher, automatic policy-aware linking.

* Expanded retraction/predatory surveillance; periodic re-check jobs.

## **10\) Appendix — Glossary**

* **Evidence Ledger:** Structured store of accepted references with provenance and locators.

* **Locator:** Specific page/paragraph/sentence reference used to ground a claim.

* **Triage Card:** Candidate article summary including rationale, AI recommendation, and integrity signals.

* **Explorer Draft:** Parallel AI-generated narrative, unverified, used for comparison/import.

* **Automation by Choice:** Principle that users can let AI run end-to-end or step in for approvals at any point.

* **Workspace for Scientists:** The base identity of the platform as a comfortable environment for writing scientific articles manually, with automation as an optional layer.

* **Findings (User-provided):** Data or conclusions supplied by the author that the system structures and integrates into the article.

* **Candidates:** Retrieved articles pending triage (Keep/Discard) before entering the Evidence Ledger.

* **Provenance:** The audit trail describing how evidence entered the system (query/strategy used, timestamp, source, user decision).

* **Keep / Discard:** Binary triage decisions; Keep moves a candidate into the Evidence Ledger, Discard removes it from candidates and logs a reason (optional).

* **Literature Review (Complete):** A structured review of prior work for a topic, produced by the platform with inline citations, a reference list, and a PRISMA-style diagram.

* **Medical Article (Complete):** A manuscript with introduction, literature review, methods, results, discussion, and conclusion, with inline citations and references (and PRISMA-style diagram when applicable).

