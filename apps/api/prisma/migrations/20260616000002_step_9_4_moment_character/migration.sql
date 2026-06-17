-- Step 9.4: Add characterId to MomentLike and MomentComment for agent-based interactions
DROP INDEX IF EXISTS "MomentLike_postId_userId_key";
CREATE INDEX IF NOT EXISTS "MomentLike_characterId_idx" ON "MomentLike"("characterId");
CREATE INDEX IF NOT EXISTS "MomentComment_characterId_idx" ON "MomentComment"("characterId");
