import { useQuery } from "@tanstack/react-query";

export type JobRecord = {
  id: string;
  projectId: string;
  jobType: string;
  status: string;
  progress: number | null;
  logs: unknown;
  resumableState: unknown;
  workerId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type JobsResponse = {
  jobs: JobRecord[];
};

async function fetchJobs(projectId?: string | null, jobType?: string) {
  const params = new URLSearchParams();
  if (projectId) {
    params.set("projectId", projectId);
  }
  if (jobType) {
    params.set("jobType", jobType);
  }

  const query = params.toString();
  const response = await fetch(`/api/jobs${query ? `?${query}` : ""}`);
  if (!response.ok) {
    throw new Error("Failed to load jobs");
  }

  return response.json() as Promise<JobsResponse>;
}

export function useJobs(projectId?: string | null, jobType?: string) {
  return useQuery<JobsResponse, Error>({
    queryKey: ["jobs", projectId ?? "all", jobType ?? "all"],
    queryFn: () => fetchJobs(projectId ?? undefined, jobType),
    refetchInterval: 5_000,
  });
}
