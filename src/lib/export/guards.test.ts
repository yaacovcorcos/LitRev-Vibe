import { beforeEach, describe, expect, it, vi } from "vitest";

import { assertExportAllowed, ExportGuardError } from "./guards";
import { DEFAULT_PROJECT_SETTINGS } from "@/lib/projects/settings";

const ledgerEntryClient = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ledgerEntry: ledgerEntryClient,
  },
}));

const STRICT_SETTINGS = {
  ...DEFAULT_PROJECT_SETTINGS,
  locatorPolicy: "strict" as const,
};

describe("assertExportAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ledgerEntryClient.findMany.mockResolvedValue([]);
  });

  it("skips guard checks when locator policy is not strict", async () => {
    const relaxedSettings = {
      ...DEFAULT_PROJECT_SETTINGS,
      locatorPolicy: "allow_pending" as const,
    };

    await expect(assertExportAllowed("project-1", relaxedSettings)).resolves.toBeUndefined();
    expect(ledgerEntryClient.findMany).not.toHaveBeenCalled();
  });

  it("allows exports when all entries meet locator requirements", async () => {
    ledgerEntryClient.findMany.mockResolvedValueOnce([
      {
        id: "entry-1",
        citationKey: "smith2021",
        locators: [
          {
            page: 2,
            note: "Summary",
          },
        ],
        verifiedByHuman: true,
      },
    ]);

    await expect(assertExportAllowed("project-1", STRICT_SETTINGS)).resolves.toBeUndefined();
    expect(ledgerEntryClient.findMany).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      select: expect.any(Object),
    });
  });

  it("blocks exports when entries are missing verified locator details", async () => {
    ledgerEntryClient.findMany.mockResolvedValueOnce([
      {
        id: "entry-2",
        citationKey: "doe2022",
        locators: [
          {
            note: "Missing pointer",
          },
        ],
        verifiedByHuman: false,
      },
    ]);

    await assertExportAllowed("project-1", STRICT_SETTINGS).then(
      () => {
        throw new Error("Expected export guard to block missing locators");
      },
      (error) => {
        expect(error).toBeInstanceOf(ExportGuardError);
        expect(error.message).toMatch(/doe2022/);
      },
    );
  });
});
