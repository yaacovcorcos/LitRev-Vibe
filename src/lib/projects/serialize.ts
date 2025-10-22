import { normalizeProjectSettings } from "@/lib/projects/settings";

type SerializableProject = {
  id: string;
  name: string;
  description: string | null;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeProject(project: SerializableProject) {
  return {
    ...project,
    description: project.description ?? null,
    settings: normalizeProjectSettings(project.settings),
  };
}
