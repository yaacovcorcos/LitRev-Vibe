import type { Prisma, DraftSection, DraftSectionVersion } from "@/generated/prisma";

import { prisma } from "@/lib/prisma";
import { toInputJson } from "@/lib/prisma/json";

type TransactionClient = Prisma.TransactionClient;

export async function recordDraftSectionVersion(
  client: TransactionClient,
  section: Pick<DraftSection, "id" | "version" | "status" | "content">,
) {
  await client.draftSectionVersion.create({
    data: {
      draftSectionId: section.id,
      version: section.version,
      status: section.status,
      content: toInputJson(section.content),
    },
  });
}

export async function ensureDraftSectionVersion(
  client: TransactionClient,
  section: Pick<DraftSection, "id" | "version" | "status" | "content">,
) {
  const existing = await client.draftSectionVersion.findUnique({
    where: {
      draftSectionId_version: {
        draftSectionId: section.id,
        version: section.version,
      },
    },
  });

  if (!existing) {
    await recordDraftSectionVersion(client, section);
  }
}

export { ensureDraftSectionVersion as ensureDraftSectionVersionSnapshot };

export async function listDraftSectionVersions(projectId: string, sectionId: string): Promise<DraftSectionVersion[]> {
  const section = await prisma.draftSection.findFirst({
    where: { id: sectionId, projectId },
  });

  if (!section) {
    throw new Error("Draft section not found");
  }

  return prisma.draftSectionVersion.findMany({
    where: { draftSectionId: sectionId },
    orderBy: { version: "desc" },
  });
}

export async function rollbackDraftSection(
  projectId: string,
  sectionId: string,
  version: number,
): Promise<DraftSection> {
  return prisma.$transaction(async (tx) => {
    const section = await tx.draftSection.findFirst({
      where: { id: sectionId, projectId },
    });

    if (!section) {
      throw new Error("Draft section not found");
    }

    const snapshot = await tx.draftSectionVersion.findUnique({
      where: {
        draftSectionId_version: {
          draftSectionId: sectionId,
          version,
        },
      },
    });

    if (!snapshot) {
      throw new Error("Version not found");
    }

    const newVersionNumber = section.version + 1;

    const updated = await tx.draftSection.update({
      where: { id: sectionId },
      data: {
        content: toInputJson(snapshot.content),
        status: snapshot.status,
        version: newVersionNumber,
      },
    });

    await recordDraftSectionVersion(tx, updated);

    return updated;
  });
}
