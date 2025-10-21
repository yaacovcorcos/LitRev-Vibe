import { Cite } from "@citation-js/core";
import "@citation-js/plugin-csl";

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

      const references = options.includeLedger ? buildBibliography(context) : [];
      const referenceParagraphs = references.length > 0
        ? [
            new Paragraph({ text: "References", heading: HeadingLevel.HEADING_1 }),
            ...references.map((reference) => new Paragraph(reference)),
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
            children: [
              ...introParagraphs,
              ...sectionParagraphs,
              ...ledgerParagraphs,
              ...referenceParagraphs,
              ...prismaParagraphs,
            ],
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

function buildBibliography(context: ExportContext) {
  if (context.ledgerEntries.length === 0) {
    return [] as string[];
  }

  const items = context.ledgerEntries.map((entry) => ledgerEntryToCsl(entry));
  const citationStyle = (context.project.settings.citationStyle ?? "apa").toLowerCase();

  try {
    const cite = new Cite(items);
    const bibliography = cite.format("bibliography", {
      format: "text",
      style: citationStyle === "vancouver" ? "vancouver" : "apa",
      lang: "en-US",
    });

    const lines = Array.isArray(bibliography)
      ? bibliography
      : String(bibliography).split(/\r?\n/);

    return lines.map((line) => line.trim()).filter((line) => line.length > 0);
  } catch (error) {
    console.error("Failed to build bibliography", error);
    return [];
  }
}

function ledgerEntryToCsl(entry: ExportContext["ledgerEntries"][number]) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

  const authors = normalizeAuthors(metadata.authors ?? metadata.author);
  const issued = normalizeIssued(metadata.publishedAt ?? metadata.year);

  const itemType = typeof metadata.type === "string" ? metadata.type : "article-journal";

  return {
    id: entry.citationKey,
    type: itemType,
    title: typeof metadata.title === "string" ? metadata.title : entry.citationKey,
    author: authors,
    "container-title": typeof metadata.journal === "string" ? metadata.journal : undefined,
    issued,
    volume: typeof metadata.volume === "string" ? metadata.volume : undefined,
    issue: typeof metadata.issue === "string" ? metadata.issue : undefined,
    page: typeof metadata.pages === "string" ? metadata.pages : undefined,
    DOI: typeof metadata.doi === "string" ? metadata.doi : undefined,
    URL: typeof metadata.url === "string" ? metadata.url : undefined,
    publisher: typeof metadata.publisher === "string" ? metadata.publisher : undefined,
  };
}

function normalizeAuthors(input: unknown): Array<{ given?: string; family?: string }> | undefined {
  if (!input) {
    return undefined;
  }

  const values = Array.isArray(input) ? input : [input];

  const authors: Array<{ given?: string; family?: string }> = [];

  values.forEach((author) => {
    if (typeof author === "string") {
      const [familyRaw, givenRaw] = author.split(",");
      const family = familyRaw?.trim();
      const given = givenRaw?.trim();
      if (family || given) {
        authors.push({ family: family || undefined, given: given || undefined });
      }
      return;
    }

    if (author && typeof author === "object") {
      const record = author as Record<string, unknown>;
      const given = typeof record.given === "string"
        ? record.given
        : typeof record.first === "string"
          ? record.first
          : undefined;
      const family = typeof record.family === "string"
        ? record.family
        : typeof record.last === "string"
          ? record.last
          : undefined;

      if (given || family) {
        authors.push({ given, family });
      }
    }
  });

  return authors.length > 0 ? authors : undefined;
}

function normalizeIssued(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date && !isNaN(value.getTime())) {
    return { "date-parts": [[value.getFullYear(), value.getMonth() + 1, value.getDate()]] };
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const iso = Date.parse(value);
    if (!Number.isNaN(iso)) {
      const date = new Date(iso);
      return { "date-parts": [[date.getFullYear(), date.getMonth() + 1, date.getDate()]] };
    }

    const yearMatch = value.match(/(19|20)\d{2}/);
    if (yearMatch) {
      return { "date-parts": [[parseInt(yearMatch[0], 10)]] };
    }
  }

  return undefined;
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
