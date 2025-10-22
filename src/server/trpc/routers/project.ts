import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma";
import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";
import { toInputJson } from "@/lib/prisma/json";
import { serializeProject } from "@/lib/projects/serialize";
import {
  normalizeProjectSettings,
  projectSettingsPatchSchema,
  resolveProjectSettings,
} from "@/lib/projects/settings";
import { logActivity } from "@/lib/activity-log";

const baseProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  settings: projectSettingsPatchSchema.optional(),
});

export const projectRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const projects = await ctx.prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return projects.map(serializeProject);
  }),

  byId: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return serializeProject(project);
    }),

  create: publicProcedure
    .input(baseProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const resolvedSettings = resolveProjectSettings(input.settings);

      const project = await ctx.prisma.project.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          settings: toInputJson(resolvedSettings),
        },
      });

      await logActivity({
        projectId: project.id,
        action: "project.created",
        payload: { name: project.name },
      });

      return serializeProject(project);
    }),

  update: publicProcedure
    .input(
      baseProjectSchema.partial().extend({
        id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const updateData: Prisma.ProjectUpdateInput = {};

      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      if (input.description !== undefined) {
        updateData.description = input.description ?? null;
      }

      if (input.settings !== undefined) {
        const currentSettings = normalizeProjectSettings(existing.settings);
        const mergedSettings = resolveProjectSettings(input.settings, currentSettings);
        updateData.settings = toInputJson(mergedSettings);
      }

      if (Object.keys(updateData).length === 0) {
        return serializeProject(existing);
      }

      const updated = await ctx.prisma.project.update({
        where: { id: input.id },
        data: updateData,
      });

      await logActivity({
        projectId: input.id,
        action: "project.updated",
        payload: {
          updatedFields: Object.keys(updateData),
        },
      });

      return serializeProject(updated);
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        select: { id: true, name: true },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      await ctx.prisma.project.delete({
        where: { id: input.id },
      });

      await logActivity({
        projectId: input.id,
        action: "project.deleted",
        payload: { name: existing.name },
      });

      return { id: input.id };
    }),
});
