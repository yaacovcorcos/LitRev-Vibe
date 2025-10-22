import { prisma } from "@/lib/prisma";

export type CreateContextOptions = {
  req: Request;
};

export async function createTRPCContext(_opts: CreateContextOptions) {
  return {
    prisma,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
