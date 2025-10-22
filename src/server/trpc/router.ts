import { createTRPCRouter } from "@/server/trpc/init";
import { projectRouter } from "@/server/trpc/routers/project";

export const appRouter = createTRPCRouter({
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
