-- Step 9.6: Message component types for image, official account article and moment share cards
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'official_account_article';
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'moment_share';
