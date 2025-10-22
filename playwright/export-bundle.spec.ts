import { expect, test } from "@playwright/test";

import type { ExportContext } from "@/lib/export/context";
import { buildExportArchive } from "@/lib/export/processor";
import type { ExportJobQueuePayload } from "@/lib/export/jobs";
import { DEFAULT_PROJECT_SETTINGS } from "@/lib/projects/settings";

const generatedAt = new Date("2024-02-01T00:00:00Z");

function buildMockContext(): ExportContext {
  return {
    project: {
      id: "proj-1",
      name: "Hypertension Review",
      description: "Automated review with verified locators.",
      settings: DEFAULT_PROJECT_SETTINGS,
    },
    draftSections: [
      {
        id: "section-1",
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
        version: 2,
        approvedAt: generatedAt,
      },
    ],
    ledgerEntries: [
      {
        id: "entry-1",
        citationKey: "smith2021",
        metadata: {
          title: "Comprehensive lifestyle management",
          journal: "Cardio Journal",
          publishedAt: "2021",
          doi: "10.1000/xyz",
          authors: ["Smith, John", "Jane Doe"],
        },
        locators: [{ page: 3 }],
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

const payload: ExportJobQueuePayload = {
  jobId: "job-1",
  exportId: "export-1",
  projectId: "proj-1",
  format: "docx",
  includeLedger: true,
  includePrismaDiagram: true,
};

const primaryArtifact = {
  data: Buffer.from("docx"),
  extension: "docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

test.describe("export bundle manifest", () => {
  test("records optional attachments when toggles enabled", async () => {
    const context = buildMockContext();

    const { manifest } = await buildExportArchive({
      context,
      payload,
      primaryArtifact,
    });

    const expected = [
      { name: "manuscript/manuscript.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      { name: "attachments/bibliography.bib", contentType: "application/x-bibtex" },
      { name: "attachments/prisma-diagram.svg", contentType: "image/svg+xml" },
    ];

    expect(manifest.files).toHaveLength(expected.length);
    expect(manifest.files).toEqual(expect.arrayContaining(expected));
  });

  test("omits optional attachments when toggles disabled", async () => {
    const context = buildMockContext();

    const { manifest } = await buildExportArchive({
      context,
      payload: { ...payload, includeLedger: false, includePrismaDiagram: false },
      primaryArtifact,
    });

    const expected = [
      { name: "manuscript/manuscript.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ];

    expect(manifest.files).toHaveLength(expected.length);
    expect(manifest.files).toEqual(expect.arrayContaining(expected));
  });
});
