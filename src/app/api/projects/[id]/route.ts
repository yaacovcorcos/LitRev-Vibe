import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const projectInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type RouteParams = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const json = await request.json();
  const parsed = projectInputSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
