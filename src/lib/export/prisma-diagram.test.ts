import { describe, expect, it } from "vitest";

import { buildPrismaDiagramSvg } from "@/lib/export/prisma-diagram";
import type { PrismaFlowMetrics } from "@/lib/metrics/prisma-flow";

const sampleMetrics: PrismaFlowMetrics = {
  totalIdentified: 120,
  totalStored: 60,
  candidateCounts: {
    pending: 10,
    kept: 25,
    discarded: 25,
    needs_review: 0,
  },
  screened: 50,
  included: 20,
  pending: 10,
  lastSearchCompletedAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("buildPrismaDiagramSvg", () => {
  it("renders svg with metrics", () => {
    const svg = buildPrismaDiagramSvg(sampleMetrics);
    expect(svg).toContain("PRISMA flow diagram");
    expect(svg).toContain("Records identified");
    expect(svg).toContain("120");
    expect(svg).toContain("Records excluded");
  });

  it("computes excluded from screened", () => {
    const svg = buildPrismaDiagramSvg({ ...sampleMetrics, screened: 80, included: 30 });
    expect(svg).toContain("Studies included");
    expect(svg).toContain("30");
    expect(svg).toContain("Records excluded");
  });
});
