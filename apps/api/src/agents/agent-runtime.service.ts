import { Inject, Injectable } from "@nestjs/common";
import type { AgentAction, MemoryView, MessageView, ModelProvider, RelationshipProgressView } from "@myphone/shared";
import { ModelProviderService } from "../ai/model-provider.service.js";
import { PrismaService } from "../infra/prisma.service.js";
import { AgentContextService } from "./agent-context.service.js";
import { AgentHarnessService, type AgentHarnessRun } from "./agent-harness.service.js";
import { AgentPromptService } from "./agent-prompt.service.js";

export type WechatAgentRuntimeResult = {
  action: Extract<AgentAction, { type: "wechat.send_message" }>;
  aiRequestId: string;
  startedAt: number;
};

@Injectable()
export class AgentRuntimeService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ModelProviderService)
    private readonly modelProvider: ModelProviderService,
    @Inject(AgentHarnessService)
    private readonly agentHarness: AgentHarnessService,
    @Inject(AgentContextService)
    private readonly agentContext: AgentContextService,
    @Inject(AgentPromptService)
    private readonly agentPrompt: AgentPromptService,
  ) {}

  async handleWechatUserMessage(input: {
    userId: string;
    conversationId: string;
    characterId: string;
    agentRun: AgentHarnessRun | null;
    model: {
      provider: ModelProvider;
      modelName: string;
      apiKey: string;
    };
    character: {
      nickname: string;
      age: number;
      occupation: string | null;
      city: string | null;
      rawCharacterCard: string | null;
      relationshipStage: string;
      adultEnabled: boolean;
      structuredProfile: unknown;
    };
    recentMessages: Array<{ sender: MessageView["sender"]; content: string | null }>;
    currentUserMessage: string;
    memories: MemoryView[];
    relationship: RelationshipProgressView;
  }): Promise<WechatAgentRuntimeResult> {
    const startedAt = Date.now();
    const aiRequest = await this.prisma.aiRequest.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        conversationId: input.conversationId,
        provider: input.model.provider,
        modelName: input.model.modelName,
        requestType: "chat_reply",
        status: "pending",
        agentRunId: input.agentRun?.runId,
      },
    });

    try {
      const context = this.agentContext.buildWechatChatContext({
        conversationId: input.conversationId,
        character: input.character,
        recentMessages: input.recentMessages,
        currentUserMessage: input.currentUserMessage,
        memories: input.memories,
        relationship: input.relationship,
      });

      const prompt = this.agentPrompt.renderWechatChatReply(context);
      if (input.agentRun) {
        await this.prisma.agentRun
          .update({
            where: { id: input.agentRun.runId },
            data: {
              contextSnapshot: context.snapshot,
              promptName: prompt.name,
              promptVersion: prompt.version,
            },
          })
          .catch(() => undefined);
      }

      const rawAiContent = await this.modelProvider.generateChat({
        provider: input.model.provider,
        modelName: input.model.modelName,
        apiKey: input.model.apiKey,
        temperature: context.runtime.temperature,
        characterName: context.character.nickname,
        messages: prompt.messages,
      });
      const aiContent = this.agentPrompt.parseWechatChatReply(rawAiContent, context.character.nickname);

      return {
        aiRequestId: aiRequest.id,
        startedAt,
        action: {
          type: "wechat.send_message",
          conversationId: input.conversationId,
          content: aiContent,
          metadata: {
            aiRequestId: aiRequest.id,
            source: "agent_runtime",
          },
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.prisma.aiRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: "failed",
          latencyMs,
          errorCode: "AI_REPLY_FAILED",
          errorMessage: error instanceof Error ? error.message : "AI 回复失败",
        },
      });

      if (input.agentRun) {
        await this.agentHarness
          .markRunFailed({
            runId: input.agentRun.runId,
            provider: input.model.provider,
            modelName: input.model.modelName,
            error,
            latencyMs,
          })
          .catch(() => undefined);
      }

      throw error;
    }
  }
}
