-- AgentMemory: 新增日记本所需字段（isPinned / tags / expiresAt / createdBy）

ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "AgentMemory" ADD COLUMN IF NOT EXISTS "createdBy" VARCHAR(20) NOT NULL DEFAULT 'ai';

CREATE INDEX IF NOT EXISTS "AgentMemory_characterId_type_idx" ON "AgentMemory"("characterId", "type");
CREATE INDEX IF NOT EXISTS "AgentMemory_sourceApp_idx" ON "AgentMemory"("sourceApp");
CREATE INDEX IF NOT EXISTS "AgentMemory_isPinned_updatedAt_idx" ON "AgentMemory"("isPinned", "updatedAt");
