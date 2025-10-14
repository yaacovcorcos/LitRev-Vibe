import { useMutation, useQuery } from "@tanstack/react-query";

type NarrativeVoice = "neutral" | "confident" | "cautious";

type ComposeSectionPayload = {
  sectionId?: string;
  sectionType: "literature_review" | "introduction" | "methods" | "results" | "discussion" | "conclusion" | "custom";
  title?: string;
  instructions?: string;
  outline?: string[];
  ledgerEntryIds: string[];
  targetWordCount?: number;
};

type EnqueueComposeInput = {
  projectId: string;
  sections: ComposeSectionPayload[];
  researchQuestion?: string;
  narrativeVoice?: NarrativeVoice;
  requestId?: string;
};

type EnqueueComposeResponse = {
  jobId: string;
};

export type ProjectJob = {
  id: string;
  projectId: string;
  jobType: string;
  status: string;
  progress?: number | null;
  logs?: unknown;
  resumableState?: unknown;
  workerId?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

async function enqueueCompose({ projectId, ...payload }: EnqueueComposeInput): Promise<EnqueueComposeResponse> {
  const response = await fetch(`/api/projects/${projectId}/compose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "literature_review",
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to enqueue compose job");
  }

  return response.json() as Promise<EnqueueComposeResponse>;
}

async function fetchJob(projectId: string, jobId: string): Promise<ProjectJob> {
  const response = await fetch(`/api/projects/${projectId}/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error("Failed to load job status");
  }

  return response.json() as Promise<ProjectJob>;
}

export function useEnqueueComposeJob() {
  return useMutation<EnqueueComposeResponse, Error, EnqueueComposeInput>({
    mutationFn: enqueueCompose,
  });
}

export function useJobStatus(projectId: string | null, jobId: string | null) {
  return useQuery<ProjectJob, Error>({
    queryKey: ["jobs", projectId, jobId],
    queryFn: () => fetchJob(projectId as string, jobId as string),
    enabled: Boolean(projectId && jobId),
    refetchInterval: 5_000,
  });
}
