-- Step 9.5: Add characterId and authorType to MomentPost for character moments
ALTER TABLE "MomentPost" ADD COLUMN "authorType" VARCHAR(20) DEFAULT 'user';

-- Set default value for existing rows
UPDATE "MomentPost" SET "authorType" = 'user' WHERE "authorType" IS NULL;

-- Add not null constraint
ALTER TABLE "MomentPost" ALTER COLUMN "authorType" SET NOT NULL;
