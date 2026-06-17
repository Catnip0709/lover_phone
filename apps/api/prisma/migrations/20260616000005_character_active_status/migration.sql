ALTER TABLE "Character" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Character_userId_deletedAt_isActive_idx" ON "Character"("userId", "deletedAt", "isActive");
