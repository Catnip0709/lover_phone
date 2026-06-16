import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ConversationProfileView,
  ConversationView,
  MemoryView,
  MessageView,
  ModelProvider,
  RelationshipProgressView,
  RelationshipStage,
  SendMessageResponse,
} from "@myphone/shared";
import type { Prisma } from "@prisma/client";
import { AgentActionExecutorService } from "../agents/agent-action-executor.service.js";
import { AgentHarnessService, type AgentHarnessRun } from "../agents/agent-harness.service.js";
import { AgentMemoryService } from "../agents/agent-memory.service.js";
import { AgentPolicyService } from "../agents/agent-policy.service.js";
import { AgentRuntimeService, type WechatAgentRuntimeResult } from "../agents/agent-runtime.service.js";
import { PrismaService } from "../infra/prisma.service.js";
import { RedisService } from "../infra/redis.service.js";
import { ApiKeyCryptoService } from "../model-configs/api-key-crypto.service.js";
import { toConversationView, toMessageView } from "./conversation-mapper.js";
import type { SendMessageDto } from "./conversations.schemas.js";

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ApiKeyCryptoService)
    private readonly apiKeyCrypto: ApiKeyCryptoService,
    @Inject(RedisService)
    private readonly redis: RedisService,
    @Inject(AgentActionExecutorService)
    private readonly agentActionExecutor: AgentActionExecutorService,
    @Inject(AgentHarnessService)
    private readonly agentHarness: AgentHarnessService,
    @Inject(AgentMemoryService)
    private readonly agentMemory: AgentMemoryService,
    @Inject(AgentPolicyService)
    private readonly agentPolicy: AgentPolicyService,
    @Inject(AgentRuntimeService)
    private readonly agentRuntime: AgentRuntimeService,
  ) {}

  async list(userId: string): Promise<ConversationView[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId, deletedAt: null },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            nickname: true,
            avatarPreset: true,
            structuredProfile: true,
          },
        },
      },
      orderBy: [{ pinned: "desc" }, { lastMessageAt: "desc" }, { createdAt: "desc" }],
    });

    return conversations.map(toConversationView);
  }

  async messages(userId: string, conversationId: string): Promise<MessageView[]> {
    await this.assertOwned(userId, conversationId);

    const [, messages] = await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
      }),
      this.prisma.message.findMany({
        where: { conversationId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return messages.map(toMessageView);
  }

  async markRead(userId: string, conversationId: string): Promise<{ success: true }> {
    await this.assertOwned(userId, conversationId);
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return { success: true };
  }

  async profile(userId: string, conversationId: string): Promise<ConversationProfileView> {
    const cacheKey = this.profileCacheKey(userId, conversationId);
    const cached = await this.redis.get(cacheKey).catch(() => null);

    if (cached) {
      return JSON.parse(cached) as ConversationProfileView;
    }

    const conversation = await this.getOwnedConversation(userId, conversationId);
    const conversationForView = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        character: {
          select: {
            id: true,
            name: true,
            nickname: true,
            avatarPreset: true,
            structuredProfile: true,
          },
        },
      },
    });
    const memories = await this.agentMemory.listForProfile({
      userId,
      characterId: conversation.characterId,
      limit: 20,
    });
    const profile = {
      conversation: toConversationView(conversationForView),
      relationship: this.getRelationshipProgress(conversation.character.structuredProfile),
      memories,
    };

    await this.redis.set(cacheKey, JSON.stringify(profile), 300).catch(() => undefined);

    return profile;
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    input: SendMessageDto,
  ): Promise<SendMessageResponse> {
    this.agentPolicy.assertInputAllowed({ content: input.content, app: "wechat" });

    const conversation = await this.getOwnedConversation(userId, conversationId);
    const defaultModel = await this.getDefaultModel(userId);
    const [recentMessages, memories] = await Promise.all([
      this.getRecentMessages(userId, conversationId),
      this.agentMemory.retrieveForChat({
        userId,
        characterId: conversation.characterId,
        limit: 8,
      }),
    ]);

    const relationshipBefore = this.getRelationshipProgress(conversation.character.structuredProfile);
    const nextRelationship = this.advanceRelationship(relationshipBefore, input.content);

    const userMessage = await this.prisma.message.create({
      data: {
        userId,
        conversationId,
        characterId: conversation.characterId,
        sender: "user",
        type: "text",
        content: input.content,
        payload: {
          source: "user_input",
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        unreadCount: 0,
        lastMessagePreview: input.content,
        lastMessageAt: userMessage.createdAt,
      },
    });

    const agentRun = await this.createWechatAgentRun({
      userId,
      characterId: conversation.characterId,
      conversationId,
      userMessageId: userMessage.id,
      content: input.content,
      occurredAt: userMessage.createdAt,
    });

    const newMemories = await this.agentMemory.captureFromWechatMessage({
      userId,
      characterId: conversation.characterId,
      sourceEventId: agentRun?.eventId ?? null,
      sourceMessageId: userMessage.id,
      content: input.content,
    });

    await this.updateRelationshipProfile(conversation.characterId, conversation.character.structuredProfile, nextRelationship);
    await this.redis.del(this.profileCacheKey(userId, conversationId)).catch(() => undefined);
    await this.redis.del(this.contextCacheKey(userId, conversationId)).catch(() => undefined);

    const freshRecentMessages = [...recentMessages, userMessage];

    let runtimeResult: WechatAgentRuntimeResult | null = null;

    try {
      const nextRuntimeResult = await this.agentRuntime.handleWechatUserMessage({
        userId,
        conversationId,
        characterId: conversation.characterId,
        agentRun,
        model: defaultModel,
        character: conversation.character,
        recentMessages: freshRecentMessages,
        currentUserMessage: input.content,
        memories: this.uniqueMemories(memories.concat(newMemories)),
        relationship: nextRelationship,
      });
      runtimeResult = nextRuntimeResult;
      const aiContent = nextRuntimeResult.action.content;

      const execution = await this.agentActionExecutor.execute({
        agentRunId: agentRun?.runId ?? null,
        userId,
        characterId: conversation.characterId,
        app: "wechat",
        taskType: "chat.reply",
        action: nextRuntimeResult.action,
        metadata: {
          provider: defaultModel.provider,
          modelName: defaultModel.modelName,
          relationship: nextRelationship,
          newMemoryCount: newMemories.length,
          aiRequestId: nextRuntimeResult.aiRequestId,
          startedAt: nextRuntimeResult.startedAt,
        },
      });
      if (execution.type !== "wechat.send_message") {
        throw new BadRequestException("Agent action did not produce a WeChat message");
      }
      const aiMessage = execution.message;
      const updatedConversation = execution.conversation;
      const sentContent = aiMessage.content ?? aiContent;

      if (agentRun) {
        await this.agentHarness
          .markRunSucceeded({
            runId: agentRun.runId,
            provider: defaultModel.provider,
            modelName: defaultModel.modelName,
            outputSummary: sentContent,
            actions: [
              {
                type: "wechat.send_message",
                conversationId,
                content: sentContent,
                metadata: {
                  messageId: aiMessage.id,
                  aiRequestId: nextRuntimeResult.aiRequestId,
                },
              },
            ],
            latencyMs: Date.now() - nextRuntimeResult.startedAt,
          })
          .catch(() => undefined);
      }

      await this.redis.del(this.profileCacheKey(userId, conversationId)).catch(() => undefined);
      await this.cacheRecentMessages(userId, conversationId, freshRecentMessages.concat(aiMessage));

      return {
        userMessage: toMessageView(userMessage),
        aiMessage: toMessageView(aiMessage),
        conversation: toConversationView(updatedConversation),
        relationship: nextRelationship,
        newMemories,
      };
    } catch (error) {
      if (runtimeResult) {
        await this.prisma.aiRequest
          .update({
            where: { id: runtimeResult.aiRequestId },
            data: {
              status: "failed",
              latencyMs: Date.now() - runtimeResult.startedAt,
              errorCode: "AI_REPLY_ACTION_FAILED",
              errorMessage: error instanceof Error ? error.message : "AI 回复写入失败",
            },
          })
          .catch(() => undefined);
      }

      if (agentRun && runtimeResult) {
        await this.agentHarness
          .markRunFailed({
            runId: agentRun.runId,
            provider: defaultModel.provider,
            modelName: defaultModel.modelName,
            error,
            latencyMs: Date.now() - runtimeResult.startedAt,
          })
          .catch(() => undefined);
      }

      throw error;
    }
  }

  private async getRecentMessages(userId: string, conversationId: string) {
    const cacheKey = this.contextCacheKey(userId, conversationId);
    const cached = await this.redis.get(cacheKey).catch(() => null);

    if (cached) {
      return JSON.parse(cached) as Array<{
        sender: MessageView["sender"];
        content: string | null;
      }>;
    }

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    const orderedMessages = recentMessages.reverse();
    await this.cacheRecentMessages(userId, conversationId, orderedMessages);

    return orderedMessages;
  }

  private uniqueMemories(memories: MemoryView[]): MemoryView[] {
    const result = new Map<string, MemoryView>();

    for (const memory of memories) {
      result.set(memory.id, memory);
    }

    return Array.from(result.values());
  }

  private async createWechatAgentRun(input: {
    userId: string;
    characterId: string;
    conversationId: string;
    userMessageId: string;
    content: string;
    occurredAt: Date;
  }): Promise<AgentHarnessRun | null> {
    return this.agentHarness
      .recordWechatUserMessage({
        userId: input.userId,
        characterId: input.characterId,
        conversationId: input.conversationId,
        messageId: input.userMessageId,
        content: input.content,
        occurredAt: input.occurredAt,
      })
      .catch(() => null);
  }

  private async assertOwned(userId: string, conversationId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, deletedAt: true },
    });

    if (!conversation || conversation.deletedAt) {
      throw new NotFoundException("会话不存在");
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException("无权访问该会话");
    }
  }

  private async getOwnedConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        character: true,
      },
    });

    if (!conversation || conversation.deletedAt) {
      throw new NotFoundException("会话不存在");
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException("无权访问该会话");
    }

    return conversation;
  }

  private async getDefaultModel(userId: string): Promise<{
    provider: ModelProvider;
    modelName: string;
    apiKey: string;
  }> {
    const config = await this.prisma.modelConfig.findFirst({
      where: { userId, isDefault: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!config) {
      if (process.env.LLM_MOCK_ENABLED === "true") {
        return {
          provider: "deepseek",
          modelName: "deepseek-v4-flash",
          apiKey: "mock-api-key",
        };
      }

      throw new BadRequestException("请先在模型设置中配置默认模型");
    }

    return {
      provider: config.provider,
      modelName: config.modelName,
      apiKey: this.apiKeyCrypto.decrypt(config),
    };
  }

  private advanceRelationship(
    current: RelationshipProgressView,
    content: string,
  ): RelationshipProgressView {
    const intimacySignals = [/想你|喜欢你|爱你|抱抱|亲亲/, /陪我|需要你|只想找你/, /晚安|早安|梦到你/];
    const trustSignals = [/告诉你|其实我|我以前|我害怕|我担心|我难过|我开心/];
    const careSignals = [/你累吗|吃饭了吗|照顾好自己|别太累|我陪你/];
    let delta = 1;

    delta += intimacySignals.filter((pattern) => pattern.test(content)).length * 4;
    delta += trustSignals.filter((pattern) => pattern.test(content)).length * 3;
    delta += careSignals.filter((pattern) => pattern.test(content)).length * 2;
    delta += Math.min(3, Math.floor(content.length / 80));

    const score = Math.min(100, current.score + delta);
    const stage = this.relationshipStageForScore(score);

    return {
      stage,
      score,
      levelName: this.relationshipLevelName(stage),
      nextLevelScore: this.nextLevelScore(score),
      momentum: delta,
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  private getRelationshipProgress(profile: unknown): RelationshipProgressView {
    const normalized = this.normalizeProfile(profile);
    const relationship = normalized.relationship as Partial<RelationshipProgressView> | undefined;
    const score = typeof relationship?.score === "number" ? relationship.score : 12;
    const stage = this.relationshipStageForScore(score);

    return {
      stage,
      score,
      levelName: this.relationshipLevelName(stage),
      nextLevelScore: this.nextLevelScore(score),
      momentum: typeof relationship?.momentum === "number" ? relationship.momentum : 0,
      lastUpdatedAt: typeof relationship?.lastUpdatedAt === "string" ? relationship.lastUpdatedAt : null,
    };
  }

  private async updateRelationshipProfile(
    characterId: string,
    profile: unknown,
    relationship: RelationshipProgressView,
  ): Promise<void> {
    const normalized = this.normalizeProfile(profile);
    await this.prisma.character.update({
      where: { id: characterId },
      data: {
        relationshipStage: relationship.stage,
        structuredProfile: {
          ...normalized,
          relationship,
        } satisfies Prisma.InputJsonObject,
      },
    });
  }

  private normalizeProfile(profile: unknown): Prisma.InputJsonObject {
    if (typeof profile === "object" && profile !== null && !Array.isArray(profile)) {
      return profile as Prisma.InputJsonObject;
    }

    return {};
  }

  private relationshipStageForScore(score: number): RelationshipStage {
    if (score >= 75) {
      return "lover";
    }

    if (score >= 50) {
      return "dating";
    }

    if (score >= 25) {
      return "ambiguous";
    }

    return "stranger";
  }

  private relationshipLevelName(stage: RelationshipStage): string {
    const names: Record<RelationshipStage, string> = {
      stranger: "初识",
      ambiguous: "暧昧升温",
      dating: "稳定交往",
      lover: "热恋羁绊",
    };

    return names[stage];
  }

  private nextLevelScore(score: number): number | null {
    if (score < 25) {
      return 25;
    }

    if (score < 50) {
      return 50;
    }

    if (score < 75) {
      return 75;
    }

    return null;
  }

  private async cacheRecentMessages(
    userId: string,
    conversationId: string,
    messages: Array<{ sender: MessageView["sender"]; content: string | null }>,
  ): Promise<void> {
    const payload = messages
      .slice(-12)
      .map((message) => ({ sender: message.sender, content: message.content }));
    await this.redis.set(this.contextCacheKey(userId, conversationId), JSON.stringify(payload), 600).catch(() => undefined);
  }

  private profileCacheKey(userId: string, conversationId: string): string {
    return `conversation-profile:${userId}:${conversationId}`;
  }

  private contextCacheKey(userId: string, conversationId: string): string {
    return `conversation-context:${userId}:${conversationId}`;
  }

}
