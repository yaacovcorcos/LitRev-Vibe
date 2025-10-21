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
};

function safeBibtexValue(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value.replace(/[{}]/g, "");
}

export function getExportAdapter(format: ExportFormat): ExportAdapter | null {
  return (adapters[format] as ExportAdapter | undefined) ?? null;
}

export function supportedExportFormats(): ExportFormat[] {
  return exportFormats.filter((format) => Boolean(getExportAdapter(format)));
}
