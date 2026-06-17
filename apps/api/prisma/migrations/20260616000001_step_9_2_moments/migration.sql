-- Step 9.2: MomentPost, MomentLike, MomentComment tables for wechat moments feature
CREATE TABLE "MomentPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "authorName" VARCHAR(80) NOT NULL,
    "authorAvatar" TEXT,
    "content" TEXT NOT NULL,
    "imageUrls" JSONB NOT NULL DEFAULT '[]',
    "location" VARCHAR(80),
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'public',
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MomentPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MomentLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "characterId" TEXT,
    "actorName" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MomentLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MomentComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT,
    "characterId" TEXT,
    "actorName" VARCHAR(80) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MomentComment_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX "MomentPost_userId_createdAt_idx" ON "MomentPost"("userId", "createdAt" DESC);
CREATE INDEX "MomentPost_characterId_createdAt_idx" ON "MomentPost"("characterId", "createdAt" DESC);
CREATE INDEX "MomentLike_postId_idx" ON "MomentLike"("postId");
CREATE INDEX "MomentComment_postId_createdAt_idx" ON "MomentComment"("postId", "createdAt");

-- Unique constraint to prevent duplicate likes from the same actor on the same post
CREATE UNIQUE INDEX "MomentLike_postId_userId_characterId_idx" ON "MomentLike"("postId", "userId", "characterId");

ALTER TABLE "MomentPost" ADD CONSTRAINT "MomentPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MomentPost" ADD CONSTRAINT "MomentPost_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MomentLike" ADD CONSTRAINT "MomentLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MomentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MomentLike" ADD CONSTRAINT "MomentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MomentComment" ADD CONSTRAINT "MomentComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "MomentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MomentComment" ADD CONSTRAINT "MomentComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
