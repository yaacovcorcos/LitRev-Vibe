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
          const summary = formatLedgerSummary(metadata);
          const authors = formatAuthorList(metadata);
          const doi = extractIdentifier(metadata, ["doi", "DOI"]);
          const url = extractIdentifier(metadata, ["url", "URL", "link"]);

          lines.push(`- **${entry.citationKey}** — ${title}${summary ? ` (${summary})` : ""}`);

          if (authors) {
            lines.push(`  - Authors: ${authors}`);
          }

          if (doi) {
            lines.push(`  - DOI: ${doi}`);
          } else if (url) {
            lines.push(`  - Link: ${url}`);
          }
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
      const records = context.ledgerEntries
        .map((entry, index) => buildBibtexRecord(entry, index))
        .filter((record): record is string => Boolean(record));

      return {
        data: records.join("\n\n"),
        extension: "bib",
        contentType: "application/x-bibtex",
      };
    },
  },
  docx: {
    format: "docx",
    generate: async (context, options) => {
      const docxModule: any = await import("docx");
      const {
        AlignmentType,
        Document,
        HeadingLevel,
        Packer,
        Paragraph,
        Table,
        TableCell,
        TableRow,
        TextRun,
        WidthType,
      } = docxModule;

      const children: any[] = [];

      children.push(...buildTitleSection(context, Paragraph, TextRun, HeadingLevel));
      children.push(buildSummaryTable(context, Table, TableRow, TableCell, Paragraph, TextRun, WidthType));
      children.push(...buildSectionContent(context, Paragraph, HeadingLevel));

      if (options.includeLedger && context.ledgerEntries.length > 0) {
        children.push(new Paragraph({ text: "Evidence Ledger", heading: HeadingLevel.HEADING_1 }));
        children.push(
          buildLedgerTable(context, Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType),
        );
      }

      const references = options.includeLedger ? buildBibliography(context) : [];
      if (references.length > 0) {
        children.push(new Paragraph({ text: "References", heading: HeadingLevel.HEADING_1 }));
        references.forEach((reference) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: reference, font: "Times New Roman", size: 24 }),
              ],
              spacing: { after: 120 },
            }),
          );
        });
      }

      if (options.includePrismaDiagram) {
        children.push(new Paragraph({ text: "PRISMA Snapshot", heading: HeadingLevel.HEADING_1 }));
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text:
                  `Identified ${context.metrics.totalIdentified} records, stored ${context.metrics.totalStored}, screened ${context.metrics.screened}, included ${context.metrics.included}.`,
              }),
            ],
            spacing: { after: 200 },
          }),
        );
      }

      const doc = new Document({
        sections: [
          {
            children,
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
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.replace(/[{}]/g, "");
}

function extractFirstString(metadata: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return undefined;
}

function extractFirstValue(metadata: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = metadata[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function extractIdentifier(metadata: Record<string, unknown>, keys: string[]): string | null {
  return extractFirstString(metadata, keys) ?? null;
}

type WorkKind = "article" | "conference" | "book" | "other";

function determineWorkKind(metadata: Record<string, unknown>): WorkKind {
  const rawType = extractFirstString(metadata, ["type"]);
  if (rawType) {
    const type = rawType.toLowerCase();
    if (type.includes("conference") || type.includes("proceeding")) {
      return "conference";
    }
    if (type.includes("book")) {
      return "book";
    }
    if (type.includes("article")) {
      return "article";
    }
  }

  if (extractFirstString(metadata, ["journal", "containerTitle", "container_title", "container"])) {
    return "article";
  }

  if (extractFirstString(metadata, ["bookTitle", "book_title", "proceedings-title", "conference", "conferenceName", "event"])) {
    return "conference";
  }

  if (extractFirstString(metadata, ["publisher", "organization"])) {
    return "book";
  }

  return "other";
}

function mapWorkKindToBibtex(kind: WorkKind): string {
  switch (kind) {
    case "conference":
      return "inproceedings";
    case "book":
      return "book";
    case "article":
      return "article";
    default:
      return "misc";
  }
}

function mapWorkKindToCsl(kind: WorkKind): string {
  switch (kind) {
    case "conference":
      return "paper-conference";
    case "book":
      return "book";
    case "article":
      return "article-journal";
    default:
      return "report";
  }
}

function extractContainerTitle(metadata: Record<string, unknown>): string | undefined {
  return extractFirstString(metadata, [
    "journal",
    "containerTitle",
    "container_title",
    "container",
    "bookTitle",
    "book_title",
    "proceedings-title",
    "collectionTitle",
    "collection_title",
    "conference",
    "conferenceName",
    "event",
    "source",
  ]);
}

function extractLocation(metadata: Record<string, unknown>): string | undefined {
  return extractFirstString(metadata, [
    "location",
    "address",
    "place",
    "publisherLocation",
    "publisher_place",
    "city",
  ]);
}

function formatLedgerSummary(metadata: Record<string, unknown>) {
  const kind = determineWorkKind(metadata);
  const details: string[] = [];
  const container = extractContainerTitle(metadata);
  const publisher = extractFirstString(metadata, ["publisher", "organization"]);
  const location = extractLocation(metadata);
  const year = extractYear(extractFirstValue(metadata, ["publishedAt", "year", "date"])) ?? undefined;

  if (kind === "article") {
    if (container) {
      details.push(container);
    }
  } else if (kind === "conference") {
    if (container) {
      details.push(container);
    }
    if (location) {
      details.push(location);
    }
  } else if (kind === "book") {
    if (publisher) {
      details.push(publisher);
    }
    if (location) {
      details.push(location);
    }
  } else if (container) {
    details.push(container);
  }

  if (year) {
    details.push(String(year));
  }

  return details.join(", ");
}

function formatAuthorList(metadata: Record<string, unknown>): string | null {
  const authors = normalizeAuthors(metadata.authors ?? metadata.author);
  if (!authors || authors.length === 0) {
    return null;
  }

  const formatted = authors
    .map((author) => [author.given, author.family].filter((part) => part && part.trim().length > 0).join(" ").trim())
    .filter((name) => name.length > 0)
    .join("; ");

  return formatted.length > 0 ? formatted : null;
}

function formatBibtexAuthors(metadata: Record<string, unknown>): string | null {
  const authors = normalizeAuthors(metadata.authors ?? metadata.author);
  if (!authors || authors.length === 0) {
    return null;
  }

  const formatted = authors
    .map((author) => {
      const family = author.family?.trim();
      const given = author.given?.trim();
      if (family && given) {
        return `${family}, ${given}`;
      }
      return family || given || "";
    })
    .filter((name) => name.length > 0)
    .join(" and ");

  return formatted.length > 0 ? formatted : null;
}

function buildBibtexRecord(entry: ExportContext["ledgerEntries"][number], index: number): string | null {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const kind = determineWorkKind(metadata);
  const bibType = mapWorkKindToBibtex(kind);

  const fields = new Map<string, string>();

  const authors = formatBibtexAuthors(metadata);
  if (authors) {
    fields.set("author", safeBibtexValue(authors)!);
  }

  const title = safeBibtexValue(extractFirstString(metadata, ["title"]) ?? entry.citationKey);
  if (title) {
    fields.set("title", title);
  }

  const container = extractContainerTitle(metadata);
  if (kind === "article" && container) {
    const journal = safeBibtexValue(container);
    if (journal) {
      fields.set("journal", journal);
    }
  } else if (kind === "conference") {
    const bookTitle = safeBibtexValue(container ?? extractFirstString(metadata, ["booktitle"]));
    if (bookTitle) {
      fields.set("booktitle", bookTitle);
    }
    const organization = safeBibtexValue(extractFirstString(metadata, ["organization", "publisher"]));
    if (organization) {
      fields.set("organization", organization);
    }
    const address = safeBibtexValue(extractLocation(metadata));
    if (address) {
      fields.set("address", address);
    }
  } else if (kind === "book") {
    const publisher = safeBibtexValue(extractFirstString(metadata, ["publisher", "organization"]));
    if (publisher) {
      fields.set("publisher", publisher);
    }
    const address = safeBibtexValue(extractLocation(metadata));
    if (address) {
      fields.set("address", address);
    }
    const isbn = safeBibtexValue(extractFirstString(metadata, ["isbn", "ISBN"]));
    if (isbn) {
      fields.set("isbn", isbn);
    }
  } else if (container) {
    const howPublished = safeBibtexValue(container);
    if (howPublished) {
      fields.set("howpublished", howPublished);
    }
  }

  const volume = safeBibtexValue(extractFirstString(metadata, ["volume"]));
  if (volume) {
    fields.set("volume", volume);
  }

  const issue = safeBibtexValue(extractFirstString(metadata, ["issue", "number"]));
  if (issue) {
    fields.set("number", issue);
  }

  const pages = safeBibtexValue(extractFirstString(metadata, ["pages", "page"]));
  if (pages) {
    fields.set("pages", pages);
  }

  const year = extractYear(extractFirstValue(metadata, ["publishedAt", "year", "date"])) ?? undefined;
  if (year) {
    fields.set("year", String(year));
  }

  const doi = safeBibtexValue(extractFirstString(metadata, ["doi", "DOI"]));
  if (doi) {
    fields.set("doi", doi);
  }

  const url = safeBibtexValue(extractFirstString(metadata, ["url", "URL", "link"]));
  if (url) {
    fields.set("url", url);
  }

  if (fields.size === 0) {
    return null;
  }

  const fieldOrder = [
    "author",
    "title",
    "journal",
    "booktitle",
    "publisher",
    "organization",
    "howpublished",
    "year",
    "volume",
    "number",
    "pages",
    "address",
    "isbn",
    "doi",
    "url",
  ];

  const ordered = fieldOrder
    .filter((field) => fields.has(field))
    .map((field) => `  ${field} = {${fields.get(field)}}`);

  const remaining = Array.from(fields.entries())
    .filter(([field]) => !fieldOrder.includes(field))
    .map(([field, value]) => `  ${field} = {${value}}`);

  const allLines = [...ordered, ...remaining];
  const formatted = allLines.map((line, index) => (index === allLines.length - 1 ? line : `${line},`));

  const key = entry.citationKey && entry.citationKey.trim().length > 0 ? entry.citationKey : `entry_${index + 1}`;

  return [`@${bibType}{${key},`, ...formatted, "}"].join("\n");
}

function buildBibliography(context: ExportContext) {
  if (context.ledgerEntries.length === 0) {
    return [] as string[];
  }

  const items = context.ledgerEntries.map((entry) => ledgerEntryToCsl(entry));
  const citationStyle = (context.project.settings.citationStyle ?? "apa").toLowerCase();

  if (citationStyle === "vancouver") {
    return context.ledgerEntries.map((entry, index) => formatVancouverBibliography(entry, index + 1));
  }

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

function formatVancouverBibliography(entry: ExportContext["ledgerEntries"][number], index: number) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const title = typeof metadata.title === "string" ? metadata.title : entry.citationKey;
  const kind = determineWorkKind(metadata);
  const publisher = extractFirstString(metadata, ["publisher", "organization"]);
  const location = extractLocation(metadata);
  const year = extractYear(extractFirstValue(metadata, ["publishedAt", "year", "date"])) ?? undefined;
  const doi = extractFirstString(metadata, ["doi", "DOI"]);
  const url = extractFirstString(metadata, ["url", "URL", "link"]);

  let containerTitle = extractContainerTitle(metadata);
  let eventTitle: string | undefined;

  if (kind === "conference") {
    containerTitle = extractFirstString(metadata, [
      "bookTitle",
      "book_title",
      "proceedings-title",
      "containerTitle",
      "container_title",
      "container",
    ]) ?? containerTitle;
    eventTitle = extractFirstString(metadata, ["conference", "conferenceName", "event"]);
  }

  const authors = formatVancouverAuthors(metadata.authors ?? metadata.author);

  const parts = [
    `${index}.`,
    authors ?? entry.citationKey,
    title,
  ];

  if (kind === "article" && containerTitle) {
    parts.push(containerTitle);
  } else if (kind === "conference") {
    if (eventTitle) {
      parts.push(eventTitle);
    }
    if (containerTitle) {
      parts.push(containerTitle);
    }
    if (location) {
      parts.push(location);
    }
  } else if (kind === "book") {
    if (publisher) {
      parts.push(publisher);
    }
    if (location) {
      parts.push(location);
    }
  } else if (containerTitle) {
    parts.push(containerTitle);
  }

  if (year) {
    parts.push(String(year));
  }

  if (doi) {
    parts.push(`doi:${doi}`);
  } else if (url) {
    parts.push(url);
  }

  return parts.filter((part) => part && String(part).trim().length > 0).join(" ");
}

function formatVancouverAuthors(authorsInput: unknown): string | undefined {
  if (!authorsInput) {
    return undefined;
  }

  const authors = normalizeAuthors(authorsInput);
  if (!authors || authors.length === 0) {
    return undefined;
  }

  return authors
    .map((author) => {
      const family = author.family ?? "";
      const given = author.given ?? "";
      const initials = given
        .split(/[-\s]+/)
        .filter((segment) => segment.length > 0)
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .join("");
      return `${family}${initials ? ` ${initials}` : ""}`.trim();
    })
    .join(", ");
}

function extractYear(value: unknown): number | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/(19|20)\d{2}/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getFullYear();
  }

  return undefined;
}

function ledgerEntryToCsl(entry: ExportContext["ledgerEntries"][number]) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

  const authors = normalizeAuthors(metadata.authors ?? metadata.author);
  const issued = normalizeIssued(metadata.publishedAt ?? metadata.year);
  const kind = determineWorkKind(metadata);
  const itemType = extractFirstString(metadata, ["type"]) ?? mapWorkKindToCsl(kind);
  const publisher = extractFirstString(metadata, ["publisher", "organization"]);
  const publisherPlace = extractLocation(metadata);

  let containerTitle = extractContainerTitle(metadata);
  let eventTitle: string | undefined;

  if (kind === "conference") {
    containerTitle = extractFirstString(metadata, [
      "bookTitle",
      "book_title",
      "proceedings-title",
      "containerTitle",
      "container_title",
      "container",
    ]) ?? containerTitle;
    eventTitle = extractFirstString(metadata, ["conference", "conferenceName", "event"]);
  }

  return {
    id: entry.citationKey,
    type: itemType,
    title: typeof metadata.title === "string" ? metadata.title : entry.citationKey,
    author: authors,
    "container-title": containerTitle,
    "event-title": eventTitle,
    issued,
    volume: typeof metadata.volume === "string" ? metadata.volume : undefined,
    issue: typeof metadata.issue === "string" ? metadata.issue : undefined,
    page: typeof metadata.pages === "string" ? metadata.pages : undefined,
    DOI: typeof metadata.doi === "string" ? metadata.doi : undefined,
    URL: typeof metadata.url === "string" ? metadata.url : undefined,
    publisher: publisher,
    "publisher-place": publisherPlace,
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
      const normalized = author.trim();
      if (!normalized) {
        return;
      }

      if (normalized.includes(",")) {
        const [familyRaw, givenRaw] = normalized.split(",");
        const family = familyRaw?.trim();
        const given = givenRaw?.trim();
        if (family || given) {
          authors.push({ family: family || undefined, given: given || undefined });
        }
        return;
      }

      const parts = normalized.split(/\s+/);
      if (parts.length === 1) {
        authors.push({ family: parts[0] });
        return;
      }

      const family = parts.pop();
      const given = parts.join(" ");
      authors.push({ given: given || undefined, family: family || undefined });
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

function buildTitleSection(
  context: ExportContext,
  Paragraph: any,
  TextRun: any,
  HeadingLevel: any,
) {
  const paragraphs = [] as Array<InstanceType<typeof Paragraph>>;
  paragraphs.push(
    new Paragraph({
      text: context.project.name,
      heading: HeadingLevel.TITLE,
      spacing: { after: 160 },
    }),
  );

  if (context.project.description) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: context.project.description })],
        spacing: { after: 120 },
      }),
    );
  }

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Generated on ${context.generatedAt.toISOString()}`, italics: true }),
      ],
      spacing: { after: 240 },
    }),
  );

  return paragraphs;
}

function buildSummaryTable(
  context: ExportContext,
  Table: any,
  TableRow: any,
  TableCell: any,
  Paragraph: any,
  TextRun: any,
  WidthType: any,
) {
  const metrics = [
    { label: "Ledger entries", value: String(context.ledgerEntries.length) },
    { label: "Draft sections", value: String(context.draftSections.length) },
    { label: "Sources screened", value: String(context.metrics.screened) },
    { label: "Sources included", value: String(context.metrics.included) },
    { label: "Pending triage", value: String(context.metrics.candidateCounts.pending ?? 0) },
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createTableCell(TableCell, Paragraph, TextRun, "Summary Metric", true),
          createTableCell(TableCell, Paragraph, TextRun, "Value", true),
        ],
      }),
      ...metrics.map((metric) =>
        new TableRow({
          children: [
            createTableCell(TableCell, Paragraph, TextRun, metric.label),
            createTableCell(TableCell, Paragraph, TextRun, metric.value),
          ],
        }),
      ),
    ],
  });
}

function buildSectionContent(
  context: ExportContext,
  Paragraph: any,
  HeadingLevel: any,
) {
  return context.draftSections.flatMap((section) => {
    const paragraphs = extractParagraphs(section.content);
    if (paragraphs.length === 0) {
      return [] as Array<InstanceType<typeof Paragraph>>;
    }

    const headingParagraph = new Paragraph({
      text: resolveSectionHeading(section.sectionType),
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    });

    const contentParagraphs = paragraphs.map(
      (text) =>
        new Paragraph({
          text,
          spacing: { after: 160 },
        }),
    );

    return [headingParagraph, ...contentParagraphs];
  });
}

function buildLedgerTable(
  context: ExportContext,
  Table: any,
  TableRow: any,
  TableCell: any,
  Paragraph: any,
  TextRun: any,
  WidthType: any,
  AlignmentType: any,
) {
  const headerRow = new TableRow({
    children: [
      createTableCell(TableCell, Paragraph, TextRun, "Citation", true),
      createTableCell(TableCell, Paragraph, TextRun, "Title", true),
      createTableCell(TableCell, Paragraph, TextRun, "Journal", true),
      createTableCell(TableCell, Paragraph, TextRun, "Year", true),
      createTableCell(TableCell, Paragraph, TextRun, "Locator", true, AlignmentType.CENTER),
    ],
  });

  const rows = context.ledgerEntries.map((entry) => {
    const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
    const journal = typeof metadata.journal === "string" ? metadata.journal : "";
    const publishedAt = typeof metadata.publishedAt === "string" ? metadata.publishedAt : "";
    const locatorSummary = summarizeLocator(entry.locators ?? null) ?? "";

    return new TableRow({
      children: [
        createTableCell(TableCell, Paragraph, TextRun, entry.citationKey),
        createTableCell(TableCell, Paragraph, TextRun, typeof metadata.title === "string" ? metadata.title : entry.citationKey),
        createTableCell(TableCell, Paragraph, TextRun, journal),
        createTableCell(TableCell, Paragraph, TextRun, publishedAt),
        createTableCell(TableCell, Paragraph, TextRun, locatorSummary, false, AlignmentType.CENTER),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows],
  });
}

function createTableCell(
  TableCell: any,
  Paragraph: any,
  TextRun: any,
  text: string,
  bold = false,
  alignment?: any,
) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
        alignment,
      }),
    ],
  });
}

function summarizeLocator(locators: unknown) {
  if (!locators || !Array.isArray(locators) || locators.length === 0) {
    return null;
  }

  const first = locators[0] as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof first.page === "number" || typeof first.page === "string") {
    parts.push(`Page ${first.page}`);
  }
  if (typeof first.paragraph === "number" || typeof first.paragraph === "string") {
    parts.push(`Paragraph ${first.paragraph}`);
  }
  if (typeof first.sentence === "number" || typeof first.sentence === "string") {
    parts.push(`Sentence ${first.sentence}`);
  }
  const pointer = parts.join(", ");

  const note = typeof first.note === "string" ? first.note : undefined;
  const quote = typeof first.quote === "string" ? first.quote : undefined;
  const context = note ?? quote;

  return context ? `${pointer}${pointer ? " — " : ""}${context}` : pointer || "";
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
