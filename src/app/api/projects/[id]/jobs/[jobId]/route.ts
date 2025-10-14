import { NextResponse } from "next/server";

import { getJobById } from "@/lib/jobs";

type RouteParams = {
  params: {
    id: string;
    jobId: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const job = await getJobById(params.jobId);

  if (!job || job.projectId !== params.id) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
