-- AlterTable
ALTER TABLE "AiRequest" ADD COLUMN     "agentRunId" TEXT;

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "traceId" VARCHAR(80) NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "app" VARCHAR(40) NOT NULL,
    "eventType" VARCHAR(80) NOT NULL,
    "taskType" VARCHAR(80) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "modelProvider" "ModelProvider",
    "modelName" VARCHAR(80),
    "promptName" VARCHAR(80),
    "promptVersion" VARCHAR(40),
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "contextSnapshot" JSONB,
    "actions" JSONB,
    "latencyMs" INTEGER,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "traceId" VARCHAR(80) NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "app" VARCHAR(40) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "visibility" VARCHAR(20) NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "content" TEXT,
    "payload" JSONB NOT NULL,
    "idempotencyKey" VARCHAR(120),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentToolCall" (
    "id" TEXT NOT NULL,
    "agentRunId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT,
    "toolName" VARCHAR(120) NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "riskLevel" VARCHAR(20) NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "status" VARCHAR(30) NOT NULL,
    "latencyMs" INTEGER,
    "errorCode" VARCHAR(80),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "scope" VARCHAR(40) NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "content" TEXT NOT NULL,
    "structured" JSONB NOT NULL,
    "sourceApp" VARCHAR(40) NOT NULL,
    "sourceEventId" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 70,
    "weight" INTEGER NOT NULL DEFAULT 50,
    "sensitivity" VARCHAR(20) NOT NULL DEFAULT 'low',
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_traceId_idx" ON "AgentRun"("traceId");

-- CreateIndex
CREATE INDEX "AgentRun_userId_characterId_createdAt_idx" ON "AgentRun"("userId", "characterId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentRun_status_createdAt_idx" ON "AgentRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentEvent_traceId_idx" ON "AgentEvent"("traceId");

-- CreateIndex
CREATE INDEX "AgentEvent_userId_characterId_occurredAt_idx" ON "AgentEvent"("userId", "characterId", "occurredAt");

-- CreateIndex
CREATE INDEX "AgentEvent_app_type_occurredAt_idx" ON "AgentEvent"("app", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentEvent_userId_idempotencyKey_key" ON "AgentEvent"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentToolCall_agentRunId_idx" ON "AgentToolCall"("agentRunId");

-- CreateIndex
CREATE INDEX "AgentToolCall_userId_characterId_createdAt_idx" ON "AgentToolCall"("userId", "characterId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentToolCall_toolName_createdAt_idx" ON "AgentToolCall"("toolName", "createdAt");

-- CreateIndex
CREATE INDEX "AgentState_characterId_idx" ON "AgentState"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentState_userId_characterId_key" ON "AgentState"("userId", "characterId");

-- CreateIndex
CREATE INDEX "AgentMemory_characterId_enabled_weight_idx" ON "AgentMemory"("characterId", "enabled", "weight");

-- CreateIndex
CREATE INDEX "AgentMemory_userId_characterId_type_idx" ON "AgentMemory"("userId", "characterId", "type");

-- CreateIndex
CREATE INDEX "AgentMemory_sourceEventId_idx" ON "AgentMemory"("sourceEventId");

-- CreateIndex
CREATE INDEX "AiRequest_agentRunId_idx" ON "AiRequest"("agentRunId");

-- AddForeignKey
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentToolCall" ADD CONSTRAINT "AgentToolCall_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentState" ADD CONSTRAINT "AgentState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentState" ADD CONSTRAINT "AgentState_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
