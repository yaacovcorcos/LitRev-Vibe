import type { ExportContext } from "@/lib/export/context";
import type { ExportArtifact } from "@/lib/export/storage";
import { exportFormats, type ExportFormat } from "@/lib/projects/settings";

export type ExportAdapter = {
  format: ExportFormat;
  generate: (context: ExportContext, options: ExportAdapterOptions) => Promise<ExportArtifact>;
};

export type ExportAdapterOptions = {
  includePrismaDiagram: boolean;
  includeLedger: boolean;
};

const adapters: Partial<Record<ExportFormat, ExportAdapter>> = {
  markdown: {
    format: "markdown",
    generate: async (context, options) => {
      const lines: string[] = [];
      lines.push(`# ${context.project.name}`);
      lines.push(`Generated on ${context.generatedAt.toISOString()}`);
      if (context.project.description) {
        lines.push("");
        lines.push(context.project.description);
      }
      lines.push("");
      lines.push("## Summary");
      lines.push(`- Ledger entries: ${context.ledgerEntries.length}`);
      lines.push(`- Draft sections: ${context.draftSections.length}`);
      lines.push(`- Sources screened: ${context.metrics.screened}`);
      lines.push(`- Sources included: ${context.metrics.included}`);

      for (const section of context.draftSections) {
        const heading = resolveSectionHeading(section.sectionType);
        const paragraphs = extractParagraphs(section.content);
        if (paragraphs.length === 0) {
          continue;
        }
        lines.push("");
        lines.push(`## ${heading}`);
        for (const paragraph of paragraphs) {
          lines.push("");
          lines.push(paragraph);
        }
      }

      if (options.includeLedger && context.ledgerEntries.length > 0) {
        lines.push("");
        lines.push("## Evidence Ledger");
        for (const entry of context.ledgerEntries) {
          const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
          const title = typeof metadata.title === "string" ? metadata.title : entry.citationKey;
          const journal = typeof metadata.journal === "string" ? metadata.journal : null;
          const year = typeof metadata.publishedAt === "string" ? metadata.publishedAt : null;
          const summary = [journal, year].filter(Boolean).join(", ");

          lines.push(`- **${entry.citationKey}** — ${title}${summary ? ` (${summary})` : ""}`);
        }
      }

      if (options.includePrismaDiagram) {
        lines.push("");
        lines.push("## PRISMA Snapshot");
        lines.push(
          `Identified ${context.metrics.totalIdentified} records, stored ${context.metrics.totalStored}, screened ${context.metrics.screened}, included ${context.metrics.included}. Detailed diagram coming soon.`,
        );
      }

      return {
        data: lines.join("\n"),
        extension: "md",
        contentType: "text/markdown",
      };
    },
  },
  bibtex: {
    format: "bibtex",
    generate: async (context) => {
      const entries = context.ledgerEntries.map((entry) => {
        const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
        const title = safeBibtexValue(metadata.title);
        const journal = safeBibtexValue(metadata.journal);
        const year = safeBibtexValue(metadata.publishedAt ?? metadata.year);
        const doi = safeBibtexValue(metadata.doi ?? metadata.DOI);

        const fields: string[] = [];
        if (title) fields.push(`  title = {${title}}`);
        if (journal) fields.push(`  journal = {${journal}}`);
        if (year) fields.push(`  year = {${year}}`);
        if (doi) fields.push(`  doi = {${doi}}`);

        return [`@article{${entry.citationKey},`, fields.join(",\n"), "}\n"].filter(Boolean).join("\n");
      });

      return {
        data: entries.join("\n"),
        extension: "bib",
        contentType: "application/x-bibtex",
      };
    },
  },
  docx: {
    format: "docx",
    generate: async (context, options) => {
      const docxModule: any = await import("docx");
      const { Document, HeadingLevel, Packer, Paragraph, TextRun } = docxModule;

      const introParagraphs: any[] = [
        new Paragraph({ text: context.project.name, heading: HeadingLevel.TITLE }),
        ...(context.project.description ? [new Paragraph(context.project.description)] : []),
        new Paragraph({ text: `Generated on ${context.generatedAt.toISOString()}`, spacing: { after: 200 } }),
        new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_1 }),
        new Paragraph(`Ledger entries: ${context.ledgerEntries.length}`),
        new Paragraph(`Draft sections: ${context.draftSections.length}`),
        new Paragraph(`Sources screened: ${context.metrics.screened}`),
        new Paragraph(`Sources included: ${context.metrics.included}`),
      ];

      const sectionParagraphs = context.draftSections.flatMap((section) => {
        const paragraphs = extractParagraphs(section.content);
        if (paragraphs.length === 0) {
          return [];
        }
        const headingParagraph = new Paragraph({
          text: resolveSectionHeading(section.sectionType),
          heading: HeadingLevel.HEADING_1,
        });

        const contentParagraphs = paragraphs.map((text) => new Paragraph(text));
        return [headingParagraph, ...contentParagraphs];
      });

      const ledgerParagraphs = options.includeLedger && context.ledgerEntries.length > 0
        ? [
            new Paragraph({ text: "Evidence Ledger", heading: HeadingLevel.HEADING_1 }),
            ...context.ledgerEntries.map((entry) => {
              const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
              const title = typeof metadata.title === "string" ? metadata.title : entry.citationKey;
              const journal = typeof metadata.journal === "string" ? metadata.journal : null;
              const year = typeof metadata.publishedAt === "string" ? metadata.publishedAt : null;
              const summary = [journal, year].filter(Boolean).join(", ");

              const runs = [
                new TextRun({ text: `${entry.citationKey}: `, bold: true }),
                new TextRun(title),
              ];
              if (summary) {
                runs.push(new TextRun({ text: ` (${summary})` }));
              }

              return new Paragraph({ children: runs });
            }),
          ]
        : [];

      const prismaParagraphs = options.includePrismaDiagram
        ? [
            new Paragraph({ text: "PRISMA Snapshot", heading: HeadingLevel.HEADING_1 }),
            new Paragraph(
              `Identified ${context.metrics.totalIdentified} records, stored ${context.metrics.totalStored}, screened ${context.metrics.screened}, included ${context.metrics.included}. Detailed diagram coming soon.`,
            ),
          ]
        : [];

      const doc = new Document({
        sections: [
          {
            children: [...introParagraphs, ...sectionParagraphs, ...ledgerParagraphs, ...prismaParagraphs],
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);

      return {
        data: buffer,
        extension: "docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    },
  },
};

function safeBibtexValue(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.replace(/[{}]/g, "");
}

function resolveSectionHeading(sectionType: string) {
  switch (sectionType) {
    case "literature_review":
      return "Literature Review";
    case "introduction":
      return "Introduction";
    case "methods":
      return "Methods";
    case "results":
      return "Results";
    case "discussion":
      return "Discussion";
    case "conclusion":
      return "Conclusion";
    default:
      return "Draft Section";
  }
}

function extractParagraphs(content: unknown): string[] {
  const doc = content && typeof content === "object" ? (content as Record<string, unknown>) : {};
  const children = Array.isArray(doc.content) ? doc.content : Array.isArray(content) ? content : [];

  const paragraphs: string[] = [];
  const current: string[] = [];

  function walk(node: any, collectParagraph = false) {
    if (!node || typeof node !== "object") {
      return;
    }

    const type = typeof node.type === "string" ? node.type : null;

    if (type === "heading") {
      if (Array.isArray(node.content)) {
        node.content.forEach((child: any) => walk(child, false));
      }
      flush();
      return;
    }

    if (type === "text" && typeof node.text === "string") {
      current.push(node.text);
      return;
    }

    const nextCollect = collectParagraph || type === "paragraph" || type === "bulletList" || type === "orderedList" || type === "listItem";

    if (Array.isArray(node.content) && node.content.length > 0) {
      node.content.forEach((child: any) => walk(child, nextCollect));
    }

    if (nextCollect && node !== doc) {
      flush();
    }
  }

  function flush() {
    if (current.length === 0) {
      return;
    }
    const text = current.join("").replace(/\s+/g, " ").trim();
    if (text.length > 0) {
      paragraphs.push(text);
    }
    current.splice(0, current.length);
  }

  if (Array.isArray(children)) {
    children.forEach((node: any) => {
      walk(node, false);
      flush();
    });
  }

  flush();

  return paragraphs;
}

export function getExportAdapter(format: ExportFormat): ExportAdapter | null {
  return (adapters[format] as ExportAdapter | undefined) ?? null;
}

export function supportedExportFormats(): ExportFormat[] {
  return exportFormats.filter((format) => Boolean(getExportAdapter(format)));
}
