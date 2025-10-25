import { prisma } from "@/lib/prisma";
import type { ProjectSettings } from "@/lib/projects/settings";
import { entryMeetsLocatorRequirements } from "@/lib/ledger/locator-readiness";

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

  const entries = await prisma.ledgerEntry.findMany({
    where: { projectId },
    select: {
      id: true,
      citationKey: true,
      locators: true,
      verifiedByHuman: true,
    },
  });

  const violations = entries.filter((entry) =>
    !entryMeetsLocatorRequirements({
      locators: entry.locators,
      verifiedByHuman: entry.verifiedByHuman,
    }),
  );

  if (violations.length === 0) {
    return;
  }

  const sample = violations
    .slice(0, 3)
    .map((entry) => entry.citationKey || entry.id)
    .join(", ");
  const remainder = violations.length > 3 ? ` and ${violations.length - 3} others` : "";

  throw new ExportGuardError(
    `Cannot export until locators are verified for: ${sample}${remainder}. Add locator pointers, curator context, and mark them as verified or relax the locator policy.`,
  );
}
