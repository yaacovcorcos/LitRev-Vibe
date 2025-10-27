import { prisma } from "@/lib/prisma";
import type { ProjectSettings } from "@/lib/projects/settings";
import { determineLocatorStatus } from "@/lib/ledger/status";

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

  const pending = entries.filter((entry) => {
    const status = determineLocatorStatus({
      locators: entry.locators,
      verifiedByHuman: entry.verifiedByHuman,
    });
    return status === "pending_locator";
  });

  if (pending.length === 0) {
    return;
  }

  const sample = pending
    .slice(0, 3)
    .map((entry) => entry.citationKey || entry.id)
    .join(", ");
  const remainder = pending.length > 3 ? ` and ${pending.length - 3} others` : "";

  throw new ExportGuardError(
    `Cannot export while locators are missing for: ${sample}${remainder}. Add locator details or relax the locator policy to allow pending entries.`,
  );
}
