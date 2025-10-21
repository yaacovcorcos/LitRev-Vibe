import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPrismaFlowMetrics } from "@/lib/metrics/prisma-flow";

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

  return NextResponse.json({ metrics });
}
