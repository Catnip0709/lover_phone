-- Step 9.1: WechatProfile table for user virtual wechat identity
CREATE TABLE "WechatProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" VARCHAR(40) NOT NULL,
    "avatarUrl" TEXT,
    "wechatId" VARCHAR(40),
    "bio" TEXT,
    "region" VARCHAR(80),
    "walletBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "defaultMomentVisibility" VARCHAR(20) NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WechatProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WechatProfile_userId_key" UNIQUE ("userId")
);

-- Index for user lookup
CREATE INDEX "WechatProfile_userId_idx" ON "WechatProfile"("userId");

CREATE TABLE "WechatWalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "messageId" TEXT,
    "characterId" TEXT,
    "remark" VARCHAR(140),
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WechatWalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WechatWalletTransaction_messageId_key" ON "WechatWalletTransaction"("messageId");
CREATE INDEX "WechatWalletTransaction_userId_createdAt_idx" ON "WechatWalletTransaction"("userId", "createdAt");

ALTER TABLE "WechatProfile" ADD CONSTRAINT "WechatProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WechatWalletTransaction" ADD CONSTRAINT "WechatWalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WechatWalletTransaction" ADD CONSTRAINT "WechatWalletTransaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WechatWalletTransaction" ADD CONSTRAINT "WechatWalletTransaction_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
