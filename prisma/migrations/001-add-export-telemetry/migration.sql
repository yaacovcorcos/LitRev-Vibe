DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExportStatus') THEN
    CREATE TYPE "ExportStatus" AS ENUM ('pending', 'queued', 'in_progress', 'completed', 'failed');
  END IF;
END$$;

ALTER TABLE "Export"
  ADD COLUMN IF NOT EXISTS "storageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "ExportStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "error" JSONB,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

UPDATE "Export"
SET "status" = COALESCE("status", 'pending'::"ExportStatus");

CREATE INDEX IF NOT EXISTS "Export_projectId_idx" ON "Export"("projectId");
