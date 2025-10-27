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
  it("renders svg with metrics snapshot", () => {
    const svg = buildPrismaDiagramSvg(sampleMetrics);
    expect(svg).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="760" height="460" viewBox="0 0 760 460" role="img" aria-labelledby="title desc">
        <title id="title">PRISMA flow diagram</title>
        <desc id="desc">Visual summary of records identified, screened, excluded, and included.</desc>
        <rect x="0" y="0" width="760" height="460" fill="#ffffff" />
        <g>
          <rect x="270" y="30" rx="8" ry="8" width="220" height="70" fill="#F4F4F5" stroke="#D4D4D8" stroke-width="2" />
          <text x="380" y="58" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" font-weight="600" fill="#27272A">Records identified</text>
          <text x="380" y="80" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" fill="#3F3F46">120<tspan x="380" dy="18" class="subtitle">database search</tspan></text>
        </g>
      <g>
          <rect x="270" y="140" rx="8" ry="8" width="220" height="70" fill="#F4F4F5" stroke="#D4D4D8" stroke-width="2" />
          <text x="380" y="168" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" font-weight="600" fill="#27272A">Records stored</text>
          <text x="380" y="190" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" fill="#3F3F46">60</text>
        </g>
      <g>
          <rect x="270" y="250" rx="8" ry="8" width="220" height="70" fill="#F4F4F5" stroke="#D4D4D8" stroke-width="2" />
          <text x="380" y="278" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" font-weight="600" fill="#27272A">Records screened</text>
          <text x="380" y="300" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" fill="#3F3F46">50</text>
        </g>
      <g>
          <rect x="640" y="250" rx="8" ry="8" width="220" height="70" fill="#F4F4F5" stroke="#D4D4D8" stroke-width="2" />
          <text x="750" y="278" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" font-weight="600" fill="#27272A">Records excluded</text>
          <text x="750" y="300" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" fill="#3F3F46">30</text>
        </g>
      <g>
          <rect x="270" y="360" rx="8" ry="8" width="220" height="70" fill="#F4F4F5" stroke="#D4D4D8" stroke-width="2" />
          <text x="380" y="388" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" font-weight="600" fill="#27272A">Studies included</text>
          <text x="380" y="410" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="14" fill="#3F3F46">20</text>
        </g>
        <g>
          <path d="M 380 100 L 380 140" stroke="#A1A1AA" stroke-width="2" fill="none" />
          <path d="M 380 140 L 376 133.0717967697245 L 384 133.0717967697245 Z" fill="#A1A1AA" />
        </g>
      <g>
          <path d="M 380 210 L 380 250" stroke="#A1A1AA" stroke-width="2" fill="none" />
          <path d="M 380 250 L 376 243.0717967697245 L 384 243.0717967697245 Z" fill="#A1A1AA" />
        </g>
      <g>
          <path d="M 380 320 L 380 360" stroke="#A1A1AA" stroke-width="2" fill="none" />
          <path d="M 380 360 L 376 353.0717967697245 L 384 353.0717967697245 Z" fill="#A1A1AA" />
        </g>
      <g>
          <path d="M 490 285 L 640 285" stroke="#A1A1AA" stroke-width="2" fill="none" />
          <path d="M 640 285 L 633.0717967697245 289 L 633.0717967697245 281 Z" fill="#A1A1AA" />
        </g>
      </svg>"
    `);
  });

  it("computes excluded from screened", () => {
    const svg = buildPrismaDiagramSvg({ ...sampleMetrics, screened: 80, included: 30 });
    expect(svg).toContain("Studies included");
    expect(svg).toContain("30");
    expect(svg).toContain("Records excluded");
  });
});
