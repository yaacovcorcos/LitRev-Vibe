import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPrismaFlowMetrics } from "@/lib/metrics/prisma-flow";
import { buildPrismaDiagramSvg } from "@/lib/export/prisma-diagram";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const metrics = await getPrismaFlowMetrics(project.id);
  const svg = buildPrismaDiagramSvg(metrics);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
