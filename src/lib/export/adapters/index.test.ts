import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { DEFAULT_PROJECT_SETTINGS } from "@/lib/projects/settings";
import { getExportAdapter } from "@/lib/export/adapters";
import type { ExportContext } from "@/lib/export/context";

const generatedAt = new Date("2024-01-01T00:00:00Z");

const ARTICLE_ENTRY: ExportContext["ledgerEntries"][number] = {
  id: "entry_article",
  citationKey: "smith2021",
  metadata: {
    type: "article-journal",
    title: "Comprehensive lifestyle management",
    journal: "Cardio Journal",
    publishedAt: "2021",
    doi: "10.1000/xyz",
    url: "https://doi.org/10.1000/xyz",
    volume: "12",
    issue: "3",
    pages: "122-130",
    authors: [
      {
        given: "John A.",
        family: "Smith",
      },
      {
        given: "Jane",
        family: "Doe",
      },
    ],
  },
  locators: [
    {
      page: 3,
      paragraph: 2,
      note: "Summarized snippet",
    },
  ],
  integrityNotes: null,
  importedFrom: "pubmed",
  verifiedByHuman: true,
  keptAt: generatedAt,
};

const CONFERENCE_ENTRY: ExportContext["ledgerEntries"][number] = {
  id: "entry_conf",
  citationKey: "lee2022",
  metadata: {
    type: "paper-conference",
    title: "AI triage pipelines for cardiology",
    conference: "AI in Medicine Symposium",
    bookTitle: "Proceedings of the AI in Medicine Symposium",
    publishedAt: "2022-09-15",
    pages: "45-52",
    doi: "10.5555/conf2022",
    url: "https://example.com/conf",
    organization: "MedTech Alliance",
    location: "Zurich, Switzerland",
    authors: [
      { given: "Jamie", family: "Lee" },
      { given: "Morgan", family: "Taylor" },
    ],
  },
  locators: [
    {
      page: "Conference",
      note: "Poster summary",
    },
  ],
  integrityNotes: null,
  importedFrom: "crossref",
  verifiedByHuman: true,
  keptAt: generatedAt,
};

const BOOK_ENTRY: ExportContext["ledgerEntries"][number] = {
  id: "entry_book",
  citationKey: "brown2019",
  metadata: {
    type: "book",
    title: "Evidence-Based Practice Handbook",
    publisher: "MedPress",
    publishedAt: "2019",
    isbn: "978-1-23456-789-0",
    location: "Boston, MA",
    authors: [
      { given: "Alex", family: "Brown" },
      { given: "Dana", family: "White" },
    ],
  },
  locators: [
    {
      chapter: 4,
      note: "Key methodology reference",
    },
  ],
  integrityNotes: null,
  importedFrom: "manual",
  verifiedByHuman: true,
  keptAt: generatedAt,
};

function buildContext(overrides: Partial<ExportContext> = {}): ExportContext {
  return {
    project: {
      id: "proj_123",
      name: "Hypertension Review",
      description: "Automated review with verified locators.",
      settings: DEFAULT_PROJECT_SETTINGS,
      ...(overrides.project ?? {}),
    },
    draftSections:
      overrides.draftSections ?? [
        {
          id: "section_lit",
          sectionType: "literature_review",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Lifestyle interventions reduce systolic blood pressure." },
                ],
              },
            ],
          },
          status: "approved",
          version: 2,
          approvedAt: generatedAt,
        },
      ],
    ledgerEntries: overrides.ledgerEntries ?? [ARTICLE_ENTRY],
    metrics:
      overrides.metrics ?? {
        totalIdentified: 120,
        totalStored: 45,
        candidateCounts: {
          pending: 10,
          kept: 20,
          discarded: 15,
          needs_review: 0,
        },
        screened: 35,
        included: 20,
        pending: 10,
        lastSearchCompletedAt: generatedAt,
      },
    generatedAt: overrides.generatedAt ?? generatedAt,
  } satisfies ExportContext;
}

describe("export adapters", () => {
  it("generates readable markdown", async () => {
    const adapter = getExportAdapter("markdown");
    expect(adapter).toBeTruthy();

    const context = buildContext();
    const artifact = await adapter!.generate(context, {
      includeLedger: true,
      includePrismaDiagram: true,
    });

    expect(artifact.extension).toBe("md");
    expect(artifact.contentType).toBe("text/markdown");
    const output = artifact.data as string;
    expect(output).toContain("# Hypertension Review");
    expect(output).toContain("## Literature Review");
    expect(output).toContain("Lifestyle interventions reduce systolic blood pressure.");
    expect(output).toContain("**smith2021** — Comprehensive lifestyle management (Cardio Journal, 2021)");
    expect(output).toContain("Authors: John A. Smith; Jane Doe");
    expect(output).toContain("DOI: 10.1000/xyz");
    expect(output).toContain("PRISMA Snapshot");
  });

  it("emits bibtex records for ledger entries", async () => {
    const adapter = getExportAdapter("bibtex");
    expect(adapter).toBeTruthy();

    const artifact = await adapter!.generate(
      buildContext({ ledgerEntries: [ARTICLE_ENTRY, CONFERENCE_ENTRY, BOOK_ENTRY] }),
      {
        includeLedger: true,
        includePrismaDiagram: true,
      },
    );

    expect(artifact.extension).toBe("bib");
    const content = artifact.data as string;
    expect(content).toMatch(/@article\{smith2021/);
    expect(content).toMatch(/journal = \{Cardio Journal\}/i);
    expect(content).toMatch(/@inproceedings\{lee2022/);
    expect(content).toMatch(/booktitle = \{Proceedings of the AI in Medicine Symposium\}/i);
    expect(content).toMatch(/@book\{brown2019/);
    expect(content).toMatch(/publisher = \{MedPress\}/i);
    expect(content).toMatch(/isbn = \{978-1-23456-789-0\}/i);
  });

  it("renders metadata summaries for conference and book entries in markdown", async () => {
    const adapter = getExportAdapter("markdown");
    expect(adapter).toBeTruthy();

    const context = buildContext({ ledgerEntries: [ARTICLE_ENTRY, CONFERENCE_ENTRY, BOOK_ENTRY] });
    const artifact = await adapter!.generate(context, {
      includeLedger: true,
      includePrismaDiagram: true,
    });

    const output = artifact.data as string;
    expect(output).toContain("**lee2022** — AI triage pipelines for cardiology (Proceedings of the AI in Medicine Symposium, Zurich, Switzerland, 2022)");
    expect(output).toContain("**brown2019** — Evidence-Based Practice Handbook (MedPress, Boston, MA, 2019)");
  });

  it("generates a DOCX artifact with references when enabled", async () => {
    const adapter = getExportAdapter("docx");
    expect(adapter).toBeTruthy();

    const context = buildContext();
    const artifact = await adapter!.generate(context, {
      includeLedger: true,
      includePrismaDiagram: false,
    });

    expect(artifact.extension).toBe("docx");
    expect(artifact.contentType).toContain("vnd.openxmlformats");
    const buffer = artifact.data;
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect((buffer as Buffer).length).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(buffer as Buffer);
    const xml = await zip.file("word/document.xml")?.async("string");
    expect(xml).toBeTruthy();
    expect(xml).toContain("References");
    expect(xml).toContain("Summary Metric");
    expect(xml).toContain("Evidence Ledger");
    expect(xml).toContain("Cardio Journal");
    expect(xml).toContain("Summarized snippet");

    const withoutLedger = await adapter!.generate(context, {
      includeLedger: false,
      includePrismaDiagram: false,
    });

    const zipWithout = await JSZip.loadAsync(withoutLedger.data as Buffer);
    const xmlWithout = await zipWithout.file("word/document.xml")?.async("string");
    expect(xmlWithout).not.toContain("References");
  });

  it("formats references according to the configured citation style", async () => {
    const adapter = getExportAdapter("docx");
    expect(adapter).toBeTruthy();

    const context = buildContext();
    context.project.settings = {
      ...DEFAULT_PROJECT_SETTINGS,
      citationStyle: "vancouver",
    };

    const artifact = await adapter!.generate(context, {
      includeLedger: true,
      includePrismaDiagram: false,
    });

    const zip = await JSZip.loadAsync(artifact.data as Buffer);
    const xml = await zip.file("word/document.xml")?.async("string");
    expect(xml).toBeTruthy();
    expect(xml).toMatch(/1\.[^<]*Smith JA/);
    expect(xml).not.toContain("Smith, J. A. (2021)");
  });
});
