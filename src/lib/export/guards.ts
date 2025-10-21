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
  const result = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int as count
    FROM "LedgerEntry"
    WHERE "projectId" = ${projectId}
      AND (
        locators IS NULL
        OR jsonb_typeof(locators) <> 'array'
        OR jsonb_array_length(locators) = 0
      )
  `;

  return result.length > 0 ? Number(result[0].count) : 0;
}
