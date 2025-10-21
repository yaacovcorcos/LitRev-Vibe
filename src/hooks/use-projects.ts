import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProjectSettings, ProjectSettingsPatch } from "@/lib/projects/settings";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
};

const projectKeys = {
  all: ['projects'] as const,
  detail: (id?: string | null) => ['projects', id ?? 'unknown'] as const,
};

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects");

  if (!response.ok) {
    throw new Error("Failed to load projects");
  }

  return response.json();
}

async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`);

  if (!response.ok) {
    throw new Error("Failed to load project");
  }

  return response.json();
}

type ProjectInput = {
  name: string;
  description?: string | null;
  settings?: ProjectSettingsPatch;
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: fetchProjects,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => fetchProject(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      return response.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      return response.json() as Promise<Project>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to delete project");
      }

      return id;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}
