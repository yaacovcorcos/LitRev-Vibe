import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { ProjectSettings } from "@/lib/projects/settings";

export class ExportGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportGuardError";
  }
}

export async function assertExportAllowed(projectId: string, settings: ProjectSettings) {
  if (settings.locatorPolicy !== "strict") {
    return;
  }

  const pendingLocatorCount = await countEntriesMissingLocators(projectId);

  if (pendingLocatorCount > 0) {
    throw new ExportGuardError(
      "Cannot export while references are missing locators. Resolve locator requirements or switch the project locator policy.",
    );
  }
}

async function countEntriesMissingLocators(projectId: string) {
  return prisma.ledgerEntry.count({
    where: {
      projectId,
      OR: [
        { locators: { equals: Prisma.JsonNull } },
        { locators: { equals: [] } },
        {
          locators: {
            path: ["0"],
            equals: Prisma.JsonNull,
          },
        },
      ],
    },
  });
}
