-- Extend User with profile fields shared across apps as the global "me"
ALTER TABLE "User" ADD COLUMN "birthday" VARCHAR(40);
ALTER TABLE "User" ADD COLUMN "gender" VARCHAR(20);
ALTER TABLE "User" ADD COLUMN "bio" VARCHAR(200);
ALTER TABLE "User" ADD COLUMN "region" VARCHAR(80);

-- Allow per-app overrides to be cleared and fall back to "me" defaults
ALTER TABLE "WechatProfile" ALTER COLUMN "displayName" DROP NOT NULL;

-- Clear values that just mirrored the global identity so reads merge from User
UPDATE "WechatProfile" wp
SET "displayName" = NULL
FROM "User" u
WHERE wp."userId" = u."id"
  AND wp."displayName" IS NOT NULL
  AND (wp."displayName" = u."nickname" OR wp."displayName" = u."username");

UPDATE "WechatProfile" wp
SET "avatarUrl" = NULL
FROM "User" u
WHERE wp."userId" = u."id"
  AND wp."avatarUrl" IS NOT NULL
  AND wp."avatarUrl" = u."avatar";
