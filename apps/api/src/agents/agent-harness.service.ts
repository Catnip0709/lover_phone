import { Inject, Injectable } from "@nestjs/common";
import type { AgentAction, ModelProvider } from "@myphone/shared";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../infra/prisma.service.js";

export type AgentHarnessRun = {
  traceId: string;
  eventId: string;
  runId: string;
};

@Injectable()
export class AgentHarnessService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async recordWechatUserMessage(input: {
    userId: string;
    characterId: string;
    conversationId: string;
    messageId: string;
    content: string;
    occurredAt: Date;
  }): Promise<AgentHarnessRun> {
    const traceId = randomUUID();
    const idempotencyKey = `wechat:message:${input.messageId}`;

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.agentEvent.create({
        data: {
          traceId,
          userId: input.userId,
          characterId: input.characterId,
          app: "wechat",
          type: "message.user_sent",
          visibility: "private",
          source: "user",
          content: input.content,
          payload: {
            conversationId: input.conversationId,
            messageId: input.messageId,
          },
          idempotencyKey,
          occurredAt: input.occurredAt,
        },
      });

      const run = await tx.agentRun.create({
        data: {
          traceId,
          userId: input.userId,
          characterId: input.characterId,
          app: "wechat",
          eventType: "message.user_sent",
          taskType: "chat.reply",
          status: "running",
          inputSummary: this.summarize(input.content),
          contextSnapshot: {
            eventId: event.id,
            conversationId: input.conversationId,
            messageId: input.messageId,
            harnessVersion: "step-8.1",
          },
        },
      });

      return {
        traceId,
        eventId: event.id,
        runId: run.id,
      };
    });
  }

  async markRunSucceeded(input: {
    runId: string;
    provider: ModelProvider;
    modelName: string;
    outputSummary: string;
    actions: AgentAction[];
    latencyMs: number;
  }): Promise<void> {
    await this.prisma.agentRun.update({
      where: { id: input.runId },
      data: {
        status: "succeeded",
        modelProvider: input.provider,
        modelName: input.modelName,
        outputSummary: this.summarize(input.outputSummary),
        actions: input.actions as Prisma.InputJsonArray,
        latencyMs: input.latencyMs,
      },
    });
  }

  async markRunFailed(input: {
    runId: string;
    provider: ModelProvider;
    modelName: string;
    error: unknown;
    latencyMs: number;
  }): Promise<void> {
    await this.prisma.agentRun.update({
      where: { id: input.runId },
      data: {
        status: "failed",
        modelProvider: input.provider,
        modelName: input.modelName,
        latencyMs: input.latencyMs,
        errorCode: "AI_REPLY_FAILED",
        errorMessage: input.error instanceof Error ? input.error.message : "AI 回复失败",
      },
    });
  }

  private summarize(content: string): string {
    return content.length > 220 ? `${content.slice(0, 220)}...` : content;
  }
}
