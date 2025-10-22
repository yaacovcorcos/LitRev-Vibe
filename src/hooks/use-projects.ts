import type { inferRouterOutputs } from "@trpc/server";

import type { ProjectSettingsPatch } from "@/lib/projects/settings";
import { DEFAULT_PROJECT_SETTINGS, resolveProjectSettings } from "@/lib/projects/settings";
import { trpc } from "@/trpc/react";

import type { AppRouter } from "@/server/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type Project = RouterOutputs["project"]["list"][number];

type ProjectInput = {
  name?: string;
  description?: string | null;
  settings?: ProjectSettingsPatch;
};

export function useProjects() {
  return trpc.project.list.useQuery();
}

export function useProject(id: string | null) {
  return trpc.project.byId.useQuery(
    { id: id ?? "" },
    { enabled: Boolean(id) },
  );
}

export function useCreateProject() {
  const utils = trpc.useUtils();

  return trpc.project.create.useMutation({
    onMutate: async (input) => {
      await utils.project.list.cancel();
      const previous = utils.project.list.getData();

      const optimistic = {
        id: `temp-${Date.now()}`,
        name: input.name,
        description: input.description ?? null,
        settings: resolveProjectSettings(undefined),
        createdAt: new Date(),
        updatedAt: new Date(),
      } satisfies Project;

      if (previous) {
        utils.project.list.setData(undefined, [optimistic, ...previous]);
      } else {
        utils.project.list.setData(undefined, [optimistic]);
      }

      return { previous, optimisticId: optimistic.id };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        utils.project.list.setData(undefined, context.previous);
      }
    },
    onSuccess: (project, _input, context) => {
      utils.project.list.setData(undefined, (projects) => {
        if (!projects) {
          return [project];
        }

        return projects.map((item) =>
          context?.optimisticId && item.id === context.optimisticId ? project : item,
        );
      });
    },
    onSettled: () => {
      utils.project.list.invalidate();
    },
  });
}

export function useUpdateProject() {
  const utils = trpc.useUtils();

  return trpc.project.update.useMutation({
    onMutate: async (input) => {
      const { id } = input;

      await Promise.all([
        utils.project.list.cancel(),
        utils.project.byId.cancel({ id }),
      ]);

      const previousList = utils.project.list.getData();
      const previousDetail = utils.project.byId.getData({ id });

      utils.project.list.setData(undefined, (projects) => {
        if (!projects) {
          return projects;
        }

        return projects.map((project) =>
          project.id === id
            ? {
                ...project,
                name: input.name ?? project.name,
                description:
                  input.description !== undefined ? input.description ?? null : project.description,
                updatedAt: new Date(),
              }
            : project,
        );
      });

      if (previousDetail) {
        utils.project.byId.setData({ id }, {
          ...previousDetail,
          name: input.name ?? previousDetail.name,
          description:
            input.description !== undefined ? input.description ?? null : previousDetail.description,
          updatedAt: new Date(),
        });
      }

      return { previousList, previousDetail, id };
    },
    onError: (_error, _input, context) => {
      if (context?.previousList) {
        utils.project.list.setData(undefined, context.previousList);
      }
      if (context?.previousDetail && context.id) {
        utils.project.byId.setData({ id: context.id }, context.previousDetail);
      }
    },
    onSettled: (_result, _variables, context) => {
      utils.project.list.invalidate();
      if (context?.id) {
        utils.project.byId.invalidate({ id: context.id });
      }
    },
  });
}

export function useDeleteProject() {
  const utils = trpc.useUtils();

  return trpc.project.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.project.list.cancel();

      const previous = utils.project.list.getData();
      utils.project.list.setData(undefined, (projects) =>
        projects?.filter((project) => project.id !== id),
      );

      return { previous, id };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        utils.project.list.setData(undefined, context.previous);
      }
    },
    onSettled: (_result, _variables, context) => {
      utils.project.list.invalidate();
      if (context?.id) {
        utils.project.byId.invalidate({ id: context.id });
      }
    },
  });
}
