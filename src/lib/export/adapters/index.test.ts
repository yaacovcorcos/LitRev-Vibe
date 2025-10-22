import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { DEFAULT_PROJECT_SETTINGS } from "@/lib/projects/settings";
import { getExportAdapter } from "@/lib/export/adapters";
import type { ExportContext } from "@/lib/export/context";

function buildContext(): ExportContext {
  const generatedAt = new Date("2024-01-01T00:00:00Z");

  return {
    project: {
      id: "proj_123",
      name: "Hypertension Review",
      description: "Automated review with verified locators.",
      settings: DEFAULT_PROJECT_SETTINGS,
    },
    draftSections: [
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
    ledgerEntries: [
      {
        id: "entry_1",
        citationKey: "smith2021",
        metadata: {
          title: "Comprehensive lifestyle management",
          journal: "Cardio Journal",
          publishedAt: "2021",
          doi: "10.1000/xyz",
          authors: [
            {
              given: "John A.",
              family: "Smith",
            },
          ],
        },
        locators: [
          {
            page: 3,
            paragraph: 2,
          },
        ],
        integrityNotes: null,
        importedFrom: "pubmed",
        verifiedByHuman: true,
        keptAt: generatedAt,
      },
    ],
    metrics: {
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
    generatedAt,
  };
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
    expect(output).toContain("**smith2021**");
    expect(output).toContain("PRISMA Snapshot");
  });

  it("emits bibtex records for ledger entries", async () => {
    const adapter = getExportAdapter("bibtex");
    expect(adapter).toBeTruthy();

    const artifact = await adapter!.generate(buildContext(), {
      includeLedger: true,
      includePrismaDiagram: true,
    });

    expect(artifact.extension).toBe("bib");
    const content = artifact.data as string;
    expect(content).toContain("@article{smith2021");
    expect(content).toContain("title = {Comprehensive lifestyle management}");
    expect(content).toContain("doi = {10.1000/xyz}");
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
    expect(xml).toContain("Smith");

    const withoutLedger = await adapter!.generate(context, {
      includeLedger: false,
      includePrismaDiagram: false,
    });

    const zipWithout = await JSZip.loadAsync(withoutLedger.data as Buffer);
    const xmlWithout = await zipWithout.file("word/document.xml")?.async("string");
    expect(xmlWithout).not.toContain("References");
  });
});
