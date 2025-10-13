import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const activityKeys = {
  all: (projectId: string) => ["activity", projectId] as const,
};

type ActivityEntry = {
  id: string;
  projectId: string;
  actor: string;
  action: string;
  payload: unknown;
  createdAt: string;
  undoRef: string | null;
};

async function fetchActivity(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/activity`);

  if (!response.ok) {
    throw new Error("Failed to load activity log");
  }

  return response.json() as Promise<ActivityEntry[]>;
}

type LogActivityInput = {
  projectId: string;
  actor?: string;
  action: string;
  payload?: unknown;
  undoRef?: string | null;
};

export function useActivityLog(projectId: string | null) {
  const key = activityKeys.all(projectId ?? 'unknown');
  return useQuery({
    queryKey: key,
    queryFn: () => fetchActivity(projectId as string),
    enabled: Boolean(projectId),
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...input }: LogActivityInput) => {
      const response = await fetch(`/api/projects/${projectId}/activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to log activity");
      }

      const entry = (await response.json()) as ActivityEntry;
      return entry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: activityKeys.all(variables.projectId),
      });
    },
  });
}
