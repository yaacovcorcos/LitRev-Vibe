import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import type { ExportContext } from "@/lib/export/context";
import type { ExportJobQueuePayload } from "@/lib/export/jobs";
import { buildExportArchive } from "@/lib/export/processor";
import { DEFAULT_PROJECT_SETTINGS } from "@/lib/projects/settings";

const generatedAt = new Date("2024-01-01T00:00:00.000Z");

function buildContext(): ExportContext {
  return {
    project: {
      id: "proj_1",
      name: "Hypertension Review",
      description: "Automated review with verified locators.",
      settings: DEFAULT_PROJECT_SETTINGS,
    },
    draftSections: [
      {
        id: "section_1",
        sectionType: "literature_review",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Lifestyle interventions reduce systolic blood pressure." }],
            },
          ],
        },
        status: "approved",
        version: 3,
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
            { given: "John", family: "Smith" },
            "Jane Doe",
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
      totalStored: 60,
      candidateCounts: {
        pending: 10,
        kept: 25,
        discarded: 20,
        needs_review: 5,
      },
      screened: 50,
      included: 25,
      pending: 10,
      lastSearchCompletedAt: generatedAt,
    },
    generatedAt,
  };
}

const basePayload: ExportJobQueuePayload = {
  jobId: "job-1",
  exportId: "export-1",
  projectId: "proj_1",
  format: "docx",
  includeLedger: true,
  includePrismaDiagram: true,
};

describe("buildExportArchive", () => {
  it("packages primary artifact with bibliography and diagram", async () => {
    const context = buildContext();
    const { buffer, manifest } = await buildExportArchive({
      context,
      payload: basePayload,
      primaryArtifact: {
        data: Buffer.from("docx"),
        extension: "docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });

    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files);
    expect(names).toContain("manifest.json");
    expect(names).toContain("manuscript/manuscript.docx");
    expect(names).toContain("attachments/bibliography.bib");
    expect(names).toContain("attachments/prisma-diagram.svg");

    const manifestJson = await zip.file("manifest.json")?.async("string");
    expect(manifestJson).toBeTruthy();
    const parsed = JSON.parse(manifestJson!);
    expect(parsed.files.length).toBe(3);
    expect(manifest.files).toEqual(parsed.files);
  });

  it("omits optional artifacts when disabled", async () => {
    const context = buildContext();
    const { buffer } = await buildExportArchive({
      context,
      payload: { ...basePayload, includeLedger: false, includePrismaDiagram: false },
      primaryArtifact: {
        data: Buffer.from("docx"),
        extension: "docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });

    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files);
    expect(names).toContain("manuscript/manuscript.docx");
    expect(names).not.toContain("attachments/bibliography.bib");
    expect(names).not.toContain("attachments/prisma-diagram.svg");
  });
});
