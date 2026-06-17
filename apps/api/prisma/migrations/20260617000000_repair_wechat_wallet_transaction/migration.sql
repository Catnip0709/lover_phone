-- Repair migration: some local databases applied step_9_1 before the wallet
-- transaction table was added to that migration file.
CREATE TABLE IF NOT EXISTS "WechatWalletTransaction" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "WechatWalletTransaction_messageId_key"
    ON "WechatWalletTransaction"("messageId");

CREATE INDEX IF NOT EXISTS "WechatWalletTransaction_userId_createdAt_idx"
    ON "WechatWalletTransaction"("userId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WechatWalletTransaction_userId_fkey'
    ) THEN
        ALTER TABLE "WechatWalletTransaction"
            ADD CONSTRAINT "WechatWalletTransaction_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WechatWalletTransaction_messageId_fkey'
    ) THEN
        ALTER TABLE "WechatWalletTransaction"
            ADD CONSTRAINT "WechatWalletTransaction_messageId_fkey"
            FOREIGN KEY ("messageId") REFERENCES "Message"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WechatWalletTransaction_characterId_fkey'
    ) THEN
        ALTER TABLE "WechatWalletTransaction"
            ADD CONSTRAINT "WechatWalletTransaction_characterId_fkey"
            FOREIGN KEY ("characterId") REFERENCES "Character"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
