import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { normalizeProjectSettings, type ProjectSettings } from "@/lib/projects/settings";
import { getPrismaFlowMetrics, type PrismaFlowMetrics } from "@/lib/metrics/prisma-flow";

export type ExportLedgerEntry = {
  id: string;
  citationKey: string;
  metadata: Prisma.JsonValue;
  locators: Prisma.JsonValue;
  integrityNotes: Prisma.JsonValue | null;
  importedFrom: string | null;
  verifiedByHuman: boolean;
  keptAt: Date;
};

export type ExportDraftSection = {
  id: string;
  sectionType: string;
  content: Prisma.JsonValue;
  status: string;
  version: number;
  approvedAt: Date | null;
};

export type ExportContext = {
  project: {
    id: string;
    name: string;
    description: string | null;
    settings: ProjectSettings;
  };
  draftSections: ExportDraftSection[];
  ledgerEntries: ExportLedgerEntry[];
  metrics: PrismaFlowMetrics;
  generatedAt: Date;
};

export async function buildExportContext(projectId: string): Promise<ExportContext> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      settings: true,
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const [draftSections, ledgerEntries, metrics] = await Promise.all([
    prisma.draftSection.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        sectionType: true,
        content: true,
        status: true,
        version: true,
        approvedAt: true,
      },
    }),
    prisma.ledgerEntry.findMany({
      where: { projectId },
      orderBy: { keptAt: "asc" },
      select: {
        id: true,
        citationKey: true,
        metadata: true,
        locators: true,
        integrityNotes: true,
        importedFrom: true,
        verifiedByHuman: true,
        keptAt: true,
      },
    }),
    getPrismaFlowMetrics(projectId),
  ]);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      settings: normalizeProjectSettings(project.settings),
    },
    draftSections,
    ledgerEntries,
    metrics,
    generatedAt: new Date(),
  };
}
