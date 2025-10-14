import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export type ActivityEntry = {
  id: string;
  projectId: string;
  actor: string;
  action: string;
  payload: Prisma.JsonValue | null;
  createdAt: Date;
  undoRef: string | null;
};

export async function listActivity(projectId: string, limit = 50) {
  const entries = await prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return entries as ActivityEntry[];
}

export type LogActivityInput = {
  projectId: string;
  actor?: string;
  action: string;
  payload?: Prisma.InputJsonValue | null;
  undoRef?: string | null;
};

export async function logActivity({
  projectId,
  actor = "system",
  action,
  payload = null,
  undoRef = null,
}: LogActivityInput) {
  const entry = await prisma.activityLog.create({
    data: {
      projectId,
      actor,
      action,
      payload: payload ?? Prisma.JsonNull,
      undoRef,
    },
  });

  return entry as ActivityEntry;
}
