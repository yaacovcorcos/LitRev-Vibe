import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  EMPTY_PLAN_RESPONSE,
  type ResearchPlanContent,
  type ResearchPlanPayload,
} from "@/lib/planning/plan";
import type { GeneratedPlanSuggestion } from "@/lib/ai/plan-generator";

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
          console.warn("useSaveResearchPlan: projectId is required to save a plan.");
          return Promise.reject(
            new Error("Unable to save plan without a project context."),
          );
        }

        const response = await fetch(`/api/projects/${projectId}/planning`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(plan),
        });

        if (!response.ok) {
          let message = "Failed to save plan";
          try {
            const body = await response.json();
            if (typeof body?.error === "string") {
              message = body.error;
            } else if (body?.error?.message) {
              message = body.error.message;
            }
          } catch (error) {
            console.error("useSaveResearchPlan: unable to parse error response", error);
          }
          console.error("useSaveResearchPlan: save request failed", {
            status: response.status,
            statusText: response.statusText,
          });
          throw new Error(message);
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
      onError: (error, _plan, context) => {
        console.error("useSaveResearchPlan: mutation error", error);
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

type GenerateInput = {
  plan?: Partial<ResearchPlanContent>;
};

export function useGenerateResearchPlan(projectId: string | null) {
  return useMutation<GeneratedPlanSuggestion, Error, GenerateInput | void>(
    async (input) => {
      if (!projectId) {
        return Promise.reject(new Error("Unable to generate plan without a project context."));
      }

      const response = await fetch(`/api/projects/${projectId}/planning/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input ?? {}),
      });

      if (!response.ok) {
        let message = "Failed to generate plan suggestions";
        try {
          const body = await response.json();
          if (typeof body?.error === "string") {
            message = body.error;
          } else if (body?.error?.message) {
            message = body.error.message;
          }
        } catch (error) {
          console.error("useGenerateResearchPlan: unable to parse error response", error);
        }
        console.error("useGenerateResearchPlan: generation request failed", {
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(message);
      }

      const data = (await response.json()) as { plan: GeneratedPlanSuggestion };
      return data.plan;
    },
  );
}
