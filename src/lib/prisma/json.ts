import { Prisma } from "@/generated/prisma";

export function toInputJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function toNullableInputJson<T>(
  value: T | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return toInputJson(value as T);
}
