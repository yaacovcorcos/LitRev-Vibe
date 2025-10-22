-- Add optional questions field to research plans and ensure uniqueness per project
ALTER TABLE "ResearchPlan"
ADD COLUMN IF NOT EXISTS "questions" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "ResearchPlan_projectId_key"
ON "ResearchPlan"("projectId");
