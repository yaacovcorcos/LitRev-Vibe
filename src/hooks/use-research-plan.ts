import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  EMPTY_PLAN_RESPONSE,
  type ResearchPlanContent,
  type ResearchPlanPayload,
} from "@/lib/planning/plan";

const planKeys = {
  detail: (projectId: string | null) => [
    "projects",
    projectId ?? "unknown",
    "plan",
  ],
} as const;

async function fetchPlan(projectId: string): Promise<ResearchPlanPayload> {
  const response = await fetch(`/api/projects/${projectId}/planning`);

  if (!response.ok) {
    throw new Error("Failed to load plan");
  }

  return response.json();
}

export function useResearchPlan(projectId: string | null) {
  return useQuery({
    queryKey: planKeys.detail(projectId),
    enabled: Boolean(projectId),
    queryFn: () => fetchPlan(projectId as string),
  });
}

type SaveContext = {
  previous?: ResearchPlanPayload;
};

export function useSaveResearchPlan(projectId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<ResearchPlanPayload, Error, ResearchPlanContent, SaveContext>(
    {
      mutationFn: async (plan) => {
        if (!projectId) {
          throw new Error("Project ID is required to save a plan");
        }

        const response = await fetch(`/api/projects/${projectId}/planning`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(plan),
        });

        if (!response.ok) {
          throw new Error("Failed to save plan");
        }

        return response.json();
      },
      onMutate: async (plan) => {
        if (!projectId) {
          return {};
        }

        await queryClient.cancelQueries({ queryKey: planKeys.detail(projectId) });
        const previous = queryClient.getQueryData<ResearchPlanPayload>(
          planKeys.detail(projectId),
        );
        const base = previous ?? EMPTY_PLAN_RESPONSE;

        const optimistic: ResearchPlanPayload = {
          ...base,
          ...plan,
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(planKeys.detail(projectId), optimistic);

        return { previous };
      },
      onError: (_error, _plan, context) => {
        if (projectId && context?.previous) {
          queryClient.setQueryData(planKeys.detail(projectId), context.previous);
        }
      },
      onSuccess: (data) => {
        if (projectId) {
          queryClient.setQueryData(planKeys.detail(projectId), data);
        }
      },
      onSettled: () => {
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: planKeys.detail(projectId) });
        }
      },
    },
  );
}
