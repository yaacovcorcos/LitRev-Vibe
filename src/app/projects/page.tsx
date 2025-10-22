"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Folder, Loader2, PlusCircle, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
  type Project,
} from "@/hooks/use-projects";

export default function ProjectsPage() {
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [formState, setFormState] = useState({
    name: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editFormState, setEditFormState] = useState({ name: "", description: "" });
  const [editError, setEditError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formState.name.trim();

    if (!trimmedName) {
      setFormError("Project name is required.");
      return;
    }

    setFormError(null);
    createProject.mutate(
      {
        name: trimmedName,
        description: formState.description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormState({ name: "", description: "" });
        },
        onError: (error) => {
          setFormError(error.message ?? "Unable to create project.");
        },
      },
    );
  };

  const handleDelete = (projectId: string) => {
    deleteProject.mutate({ id: projectId });
  };

  const startEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditFormState({
      name: project.name,
      description: project.description ?? "",
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingProjectId(null);
    setEditFormState({ name: "", description: "" });
    setEditError(null);
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingProjectId) {
      return;
    }

    const trimmedName = editFormState.name.trim();
    if (!trimmedName) {
      setEditError("Project name is required.");
      return;
    }

    updateProject.mutate(
      {
        id: editingProjectId,
        name: trimmedName,
        description: editFormState.description.trim() || null,
      },
      {
        onSuccess: () => {
          cancelEdit();
        },
        onError: (error) => {
          setEditError(error.message ?? "Unable to update project.");
        },
      },
    );
  };

  const isCreatePending = createProject.isPending;
  const isDeletePending = deleteProject.isPending;
  const isUpdatePending = updateProject.isPending;

  const sortedProjects = useMemo(() => projects ?? [], [projects]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Workspace
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Folder className="h-5 w-5 text-muted-foreground" />
              Projects
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Create new literature review workspaces and jump into planning, triage, ledger, and drafting flows.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </header>

      <Separator />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="border-muted-foreground/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <PlusCircle className="h-5 w-5 text-muted-foreground" />
              New Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="e.g. Hypertension Lifestyle Review"
                  disabled={isCreatePending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Optional summary for collaborators or future you."
                  rows={3}
                  disabled={isCreatePending}
                />
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isCreatePending}>
                  {isCreatePending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </span>
                  ) : (
                    "Create project"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setFormState({ name: "", description: "" })}
                  disabled={isCreatePending}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Projects are single-tenant and inherit strict locator policies by default. Configure details from each project’s settings page.
          </CardFooter>
        </Card>

        <Card className="border-muted-foreground/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Existing Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isError ? (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Unable to load projects.
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-16 w-full animate-pulse rounded bg-muted/60" />
                ))}
              </div>
            ) : sortedProjects.length > 0 ? (
              <ul className="space-y-3">
                {sortedProjects.map((project) => {
                  const isEditing = editingProjectId === project.id;
                  const displayUpdatedAt = new Date(project.updatedAt).toLocaleString();

                  return (
                    <li
                      key={project.id}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        {isEditing ? (
                          <form className="space-y-3" onSubmit={handleEditSubmit}>
                            <div className="space-y-1">
                              <Label htmlFor={`edit-name-${project.id}`}>Project name</Label>
                              <Input
                                id={`edit-name-${project.id}`}
                                value={editFormState.name}
                                onChange={(event) =>
                                  setEditFormState((prev) => ({
                                    ...prev,
                                    name: event.target.value,
                                  }))
                                }
                                disabled={isUpdatePending}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`edit-description-${project.id}`}>Description</Label>
                              <Textarea
                                id={`edit-description-${project.id}`}
                                value={editFormState.description}
                                onChange={(event) =>
                                  setEditFormState((prev) => ({
                                    ...prev,
                                    description: event.target.value,
                                  }))
                                }
                                rows={3}
                                disabled={isUpdatePending}
                              />
                            </div>
                            {editError ? (
                              <p className="text-sm text-destructive">{editError}</p>
                            ) : null}
                            <div className="flex items-center gap-2">
                              <Button type="submit" size="sm" disabled={isUpdatePending}>
                                {isUpdatePending ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving…
                                  </span>
                                ) : (
                                  "Save changes"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                disabled={isUpdatePending}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div>
                            <h2 className="text-sm font-semibold text-foreground">{project.name}</h2>
                            {project.description ? (
                              <p className="text-xs text-muted-foreground">
                                {project.description}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                              Updated {displayUpdatedAt}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/project/${project.id}/planning`}>Planning</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/project/${project.id}/triage`}>Triage</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/project/${project.id}/ledger`}>Ledger</Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/project/${project.id}/draft`}>Draft</Link>
                        </Button>
                        {!isEditing ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(project)}
                          >
                            Edit
                          </Button>
                        ) : null}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={isDeletePending}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Delete project</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete project</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the project, its plans, triage candidates, ledger entries, drafts, and jobs.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(project.id)}
                                disabled={isDeletePending}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded border border-dashed border-muted-foreground/40 p-8 text-center text-sm text-muted-foreground">
                No projects yet. Create one to kick off a guided literature review.
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Deleting a project removes associated plans, triage candidates, ledger entries, drafts, and jobs.
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
