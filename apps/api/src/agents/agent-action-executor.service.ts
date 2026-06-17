import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AgentAction, AgentApp, AgentTaskType, ModelProvider, RelationshipProgressView, RelationshipStage } from "@myphone/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../infra/prisma.service.js";
import { AgentMemoryService } from "./agent-memory.service.js";
import { AgentPolicyService } from "./agent-policy.service.js";
import { AgentToolRegistryService, type AgentToolDefinition } from "./agent-tool-registry.service.js";
import { MockMcpToolAdapterService, type McpToolResult } from "./mcp-tool-adapter.service.js";

type WechatSendExecution = {
  type: "wechat.send_message";
  message: {
    id: string;
    conversationId: string;
    characterId: string;
    sender: "character";
    type: "text";
    content: string | null;
    payload: unknown;
    status: string;
    createdAt: Date;
  };
  conversation: {
    id: string;
    pinned: boolean;
    unreadCount: number;
    lastMessagePreview: string | null;
    lastMessageAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    character: {
      id: string;
      name: string;
      nickname: string;
      avatarPreset: string;
      structuredProfile: unknown;
    };
  };
};

type AgentActionExecutionResult =
  | WechatSendExecution
  | { type: "memory.write"; memoryId: string }
  | { type: "memory.merge"; memoryId: string; merged: boolean }
  | { type: "relationship.update"; relationship: RelationshipProgressView }
  | { type: "tool.call"; toolName: string; output: McpToolResult }
  | { type: "wechat.moments.like"; postId: string; liked: boolean }
  | { type: "wechat.moments.comment"; postId: string; commentId: string }
  | { type: "wechat.moments.create_post"; postId: string }
  | { type: "none"; reason: string };

@Injectable()
export class AgentActionExecutorService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AgentToolRegistryService)
    private readonly toolRegistry: AgentToolRegistryService,
    @Inject(AgentMemoryService)
    private readonly agentMemory: AgentMemoryService,
    @Inject(MockMcpToolAdapterService)
    private readonly mcpToolAdapter: MockMcpToolAdapterService,
    @Inject(AgentPolicyService)
    private readonly agentPolicy: AgentPolicyService,
  ) {}

  async execute(input: {
    agentRunId: string | null;
    userId: string;
    characterId: string;
    app: AgentApp;
    taskType: AgentTaskType;
    action: AgentAction;
    metadata?: {
      provider?: ModelProvider;
      modelName?: string;
      relationship?: RelationshipProgressView;
      newMemoryCount?: number;
      aiRequestId?: string;
      startedAt?: number;
      userConsented?: boolean;
      allowHighRisk?: boolean;
    };
  }): Promise<AgentActionExecutionResult> {
    if (input.action.type === "none") {
      return { type: "none", reason: input.action.reason };
    }

    const toolName = this.toolNameForAction(input.action);
    const tool = this.toolRegistry.get(toolName);

    return this.withToolCallLog({
      agentRunId: input.agentRunId,
      userId: input.userId,
      characterId: input.characterId,
      tool,
      action: input.action,
      run: () => {
        this.toolRegistry.assertCallable({
          toolName,
          app: input.app,
          taskType: input.taskType,
          userConsented: input.metadata?.userConsented,
          allowHighRisk: input.metadata?.allowHighRisk,
        });
        this.agentPolicy.assertToolAllowed({
          tool,
          app: input.app,
          userConsented: input.metadata?.userConsented,
          allowHighRisk: input.metadata?.allowHighRisk,
        });

        return this.executeAllowedAction(input);
      },
    });
  }

  private async executeAllowedAction(input: {
    userId: string;
    characterId: string;
    taskType: AgentTaskType;
    action: AgentAction;
    metadata?: {
      provider?: ModelProvider;
      modelName?: string;
      relationship?: RelationshipProgressView;
      newMemoryCount?: number;
      aiRequestId?: string;
      startedAt?: number;
      userConsented?: boolean;
      allowHighRisk?: boolean;
    };
  }): Promise<AgentActionExecutionResult> {
    switch (input.action.type) {
      case "wechat.send_message":
        if (input.taskType !== "chat.reply" && !(await this.isCharacterActive(input.userId, input.characterId))) {
          return { type: "none", reason: "Character is disabled" };
        }

        return this.executeWechatSendMessage({
          userId: input.userId,
          characterId: input.characterId,
          action: input.action,
          metadata: input.metadata,
        });
      case "memory.write": {
        const memory = await this.agentMemory.writeDraft({
          userId: input.userId,
          characterId: input.characterId,
          memory: input.action.memory,
        });
        return { type: "memory.write", memoryId: memory.id };
      }
      case "memory.merge": {
        const memory = await this.agentMemory.mergePatch({
          userId: input.userId,
          characterId: input.characterId,
          memoryId: input.action.memoryId,
          patch: input.action.patch,
        });
        return { type: "memory.merge", memoryId: input.action.memoryId, merged: Boolean(memory) };
      }
      case "relationship.update":
        return {
          type: "relationship.update",
          relationship: await this.updateRelationship({
            userId: input.userId,
            characterId: input.characterId,
            delta: input.action.delta,
            reason: input.action.reason,
          }),
        };
      case "wechat.moments.like":
        return this.executeWechatMomentsLike({
          userId: input.userId,
          characterId: input.characterId,
          action: input.action,
        });
      case "wechat.moments.comment":
        return this.executeWechatMomentsComment({
          userId: input.userId,
          characterId: input.characterId,
          action: input.action,
        });
      case "wechat.moments.create_post":
        return this.executeWechatMomentsCreatePost({
          userId: input.userId,
          characterId: input.characterId,
          action: input.action,
        });
      case "tool.call": {
        const tool = this.toolRegistry.get(input.action.toolName);
        if (tool.provider !== "mcp") {
          throw new BadRequestException(`Direct tool.call only supports MCP tools: ${input.action.toolName}`);
        }

        const output = await this.mcpToolAdapter.invoke({
          toolName: input.action.toolName,
          input: input.action.input,
          timeoutMs: tool.timeoutMs,
        });
        return { type: "tool.call", toolName: input.action.toolName, output };
      }
      case "none":
        return { type: "none", reason: input.action.reason };
    }
  }

  private async isCharacterActive(userId: string, characterId: string): Promise<boolean> {
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, userId, deletedAt: null },
      select: { isActive: true },
    });

    return Boolean(character?.isActive);
  }

  private async executeWechatSendMessage(input: {
    userId: string;
    characterId: string;
    action: Extract<AgentAction, { type: "wechat.send_message" }>;
    metadata?: {
      provider?: ModelProvider;
      modelName?: string;
      relationship?: RelationshipProgressView;
      newMemoryCount?: number;
      aiRequestId?: string;
      startedAt?: number;
      userConsented?: boolean;
      allowHighRisk?: boolean;
    };
  }): Promise<WechatSendExecution> {
    const safeContent = this.agentPolicy.sanitizeOutput({
      content: input.action.content,
      app: "wechat",
    });

    const aiRequestId =
      typeof input.action.metadata?.aiRequestId === "string" ? input.action.metadata.aiRequestId : input.metadata?.aiRequestId;

    const [message, conversation] = await this.prisma.$transaction(async (tx) => {
      const ownedConversation = await tx.conversation.findFirst({
        where: {
          id: input.action.conversationId,
          userId: input.userId,
          characterId: input.characterId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!ownedConversation) {
        throw new ForbiddenException("Agent action cannot write to this conversation");
      }

      const message = await tx.message.create({
        data: {
          userId: input.userId,
          conversationId: input.action.conversationId,
          characterId: input.characterId,
          sender: "character",
          type: "text",
          content: safeContent,
          payload: {
            source: "agent_action_executor",
            provider: input.metadata?.provider,
            modelName: input.metadata?.modelName,
            relationship: input.metadata?.relationship,
            newMemoryCount: input.metadata?.newMemoryCount ?? 0,
          },
          aiRequestId,
        },
      });

      const conversation = await tx.conversation.update({
        where: { id: input.action.conversationId },
        data: {
          unreadCount: { increment: 1 },
          lastMessagePreview: safeContent,
          lastMessageAt: message.createdAt,
        },
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

      if (aiRequestId) {
        await tx.aiRequest.update({
          where: { id: aiRequestId },
          data: {
            status: "success",
            latencyMs:
              typeof input.metadata?.startedAt === "number"
                ? Date.now() - input.metadata.startedAt
                : undefined,
          },
        });
      }

      return [message, conversation] as const;
    });

    return {
      type: "wechat.send_message",
      message: {
        id: message.id,
        conversationId: message.conversationId,
        characterId: message.characterId,
        sender: "character",
        type: "text",
        content: message.content,
        payload: message.payload,
        status: message.status,
        createdAt: message.createdAt,
      },
      conversation,
    };
  }

  private async validateMomentInteraction(input: {
    userId: string;
    characterId: string;
    postId: string;
  }): Promise<{ name: string; isActive: boolean }> {
    const [character, post] = await Promise.all([
      this.prisma.character.findFirst({
        where: { id: input.characterId, userId: input.userId, deletedAt: null },
        select: { name: true, isActive: true },
      }),
      this.prisma.momentPost.findUnique({
        where: { id: input.postId },
        select: { id: true, userId: true },
      }),
    ]);

    if (!character) {
      throw new ForbiddenException("Character not found or not owned by user");
    }

    if (!post || post.userId !== input.userId) {
      throw new ForbiddenException("Cannot interact with this moment");
    }

    return character;
  }

  private async executeWechatMomentsLike(input: {
    userId: string;
    characterId: string;
    action: Extract<import("@myphone/shared").AgentAction, { type: "wechat.moments.like" }>;
  }): Promise<{ type: "wechat.moments.like"; postId: string; liked: boolean } | { type: "none"; reason: string }> {
    const character = await this.validateMomentInteraction({
      userId: input.userId,
      characterId: input.characterId,
      postId: input.action.postId,
    });
    if (!character.isActive) {
      return { type: "none", reason: "Character is disabled" };
    }

    const existingLike = await this.prisma.momentLike.findFirst({
      where: {
        postId: input.action.postId,
        userId: input.userId,
        characterId: input.characterId,
      },
    });

    if (existingLike) {
      await this.prisma.momentLike.delete({ where: { id: existingLike.id } });
      return { type: "wechat.moments.like", postId: input.action.postId, liked: false };
    }

    await this.prisma.momentLike.create({
      data: {
        postId: input.action.postId,
        userId: input.userId,
        characterId: input.characterId,
        actorName: character.name,
      },
    });

    return { type: "wechat.moments.like", postId: input.action.postId, liked: true };
  }

  private async executeWechatMomentsComment(input: {
    userId: string;
    characterId: string;
    action: Extract<import("@myphone/shared").AgentAction, { type: "wechat.moments.comment" }>;
  }): Promise<{ type: "wechat.moments.comment"; postId: string; commentId: string } | { type: "none"; reason: string }> {
    const character = await this.validateMomentInteraction({
      userId: input.userId,
      characterId: input.characterId,
      postId: input.action.postId,
    });
    if (!character.isActive) {
      return { type: "none", reason: "Character is disabled" };
    }

    const safeContent = this.agentPolicy.sanitizeOutput({
      content: input.action.content,
      app: "wechat",
    });

    const comment = await this.prisma.momentComment.create({
      data: {
        postId: input.action.postId,
        characterId: input.characterId,
        actorName: character.name,
        content: safeContent,
      },
    });

    return { type: "wechat.moments.comment", postId: input.action.postId, commentId: comment.id };
  }

  private async executeWechatMomentsCreatePost(input: {
    userId: string;
    characterId: string;
    action: Extract<import("@myphone/shared").AgentAction, { type: "wechat.moments.create_post" }>;
  }): Promise<{ type: "wechat.moments.create_post"; postId: string } | { type: "none"; reason: string }> {
    const character = await this.prisma.character.findFirst({
      where: { id: input.characterId, userId: input.userId, deletedAt: null },
      select: { name: true, structuredProfile: true, isActive: true },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    if (!character.isActive) {
      return { type: "none", reason: "Character is disabled" };
    }

    const safeContent = this.agentPolicy.sanitizeOutput({
      content: input.action.content,
      app: "wechat",
    });
    const profile = this.normalizeProfile(character.structuredProfile);
    const avatarUrl = typeof profile.avatarUrl === "string" && profile.avatarUrl.trim() ? profile.avatarUrl : null;

    const post = await this.prisma.momentPost.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        authorType: "character",
        authorName: character.name,
        authorAvatar: avatarUrl,
        content: safeContent,
        imageUrls: input.action.imageUrls ?? [],
        location: input.action.location || null,
        visibility: input.action.visibility ?? "public",
      },
    });

    return { type: "wechat.moments.create_post", postId: post.id };
  }

  private async updateRelationship(input: {
    userId: string;
    characterId: string;
    delta: number;
    reason: string;
  }): Promise<RelationshipProgressView> {
    const character = await this.prisma.character.findFirstOrThrow({
      where: { id: input.characterId, userId: input.userId, deletedAt: null },
    });
    const profile = this.normalizeProfile(character.structuredProfile);
    const currentRelationship = this.normalizeRelationship(profile.relationship);
    const score = Math.max(0, Math.min(100, currentRelationship.score + input.delta));
    const stage = this.relationshipStageForScore(score);
    const relationship = {
      stage,
      score,
      levelName: this.relationshipLevelName(stage),
      nextLevelScore: this.nextLevelScore(score),
      momentum: input.delta,
      lastUpdatedAt: new Date().toISOString(),
      reason: input.reason,
    } satisfies RelationshipProgressView & { reason: string };

    await this.prisma.character.update({
      where: { id: character.id },
      data: {
        relationshipStage: relationship.stage,
        structuredProfile: {
          ...profile,
          relationship,
        } satisfies Prisma.InputJsonObject,
      },
    });

    return relationship;
  }

  private async withToolCallLog(input: {
    agentRunId: string | null;
    userId: string;
    characterId: string;
    tool: AgentToolDefinition;
    action: AgentAction;
    run: () => Promise<AgentActionExecutionResult>;
  }): Promise<AgentActionExecutionResult> {
    const startedAt = Date.now();
    const toolCall = input.agentRunId
      ? await this.prisma.agentToolCall.create({
          data: {
            agentRunId: input.agentRunId,
            userId: input.userId,
            characterId: input.characterId,
            toolName: input.tool.name,
            provider: input.tool.provider,
            riskLevel: input.tool.riskLevel,
            input: this.toJsonObject(input.action),
            status: "running",
          },
        })
      : null;

    try {
      const result = await input.run();
      if (toolCall) {
        await this.prisma.agentToolCall.update({
          where: { id: toolCall.id },
          data: {
            status: "succeeded",
            output: this.toJsonObject(result),
            latencyMs: Date.now() - startedAt,
          },
        });
      }

      return result;
    } catch (error) {
      if (toolCall) {
        await this.prisma.agentToolCall.update({
          where: { id: toolCall.id },
          data: {
            status: "failed",
            latencyMs: Date.now() - startedAt,
            errorCode: "AGENT_TOOL_FAILED",
            errorMessage: error instanceof Error ? error.message : "Agent tool failed",
          },
        });
      }

      throw error;
    }
  }

  private toolNameForAction(action: AgentAction): string {
    switch (action.type) {
      case "wechat.send_message":
        return "sendWechatMessage";
      case "wechat.moments.like":
        return "wechatMomentsLike";
      case "wechat.moments.comment":
        return "wechatMomentsComment";
      case "wechat.moments.create_post":
        return "wechatMomentsCreatePost";
      case "memory.write":
        return "writeMemory";
      case "memory.merge":
        return "writeMemory";
      case "relationship.update":
        return "updateRelationship";
      case "tool.call":
        return action.toolName;
      case "none":
        return "none";
    }
  }

  private normalizeProfile(profile: unknown): Prisma.InputJsonObject {
    if (typeof profile === "object" && profile !== null && !Array.isArray(profile)) {
      return profile as Prisma.InputJsonObject;
    }

    return {};
  }

  private normalizeRelationship(value: unknown): RelationshipProgressView {
    const relationship = typeof value === "object" && value !== null ? (value as Partial<RelationshipProgressView>) : {};
    const score = typeof relationship.score === "number" ? relationship.score : 12;
    const stage = this.relationshipStageForScore(score);

    return {
      stage,
      score,
      levelName: this.relationshipLevelName(stage),
      nextLevelScore: this.nextLevelScore(score),
      momentum: typeof relationship.momentum === "number" ? relationship.momentum : 0,
      lastUpdatedAt: typeof relationship.lastUpdatedAt === "string" ? relationship.lastUpdatedAt : null,
    };
  }

  private relationshipStageForScore(score: number): RelationshipStage {
    if (score >= 75) {
      return "lover";
    }
    if (score >= 45) {
      return "dating";
    }
    if (score >= 20) {
      return "ambiguous";
    }
    return "stranger";
  }

  private relationshipLevelName(stage: RelationshipStage): string {
    return (
      {
        stranger: "初识",
        ambiguous: "暧昧升温",
        dating: "稳定约会",
        lover: "亲密恋人",
      } satisfies Record<RelationshipStage, string>
    )[stage];
  }

  private nextLevelScore(score: number): number | null {
    if (score < 20) {
      return 20;
    }
    if (score < 45) {
      return 45;
    }
    if (score < 75) {
      return 75;
    }
    return null;
  }

  private toJsonObject(value: AgentActionExecutionResult | AgentAction): Prisma.InputJsonObject {
    if ("message" in value && value.type === "wechat.send_message") {
      return {
        type: value.type,
        messageId: value.message.id,
        conversationId: value.conversation.id,
      };
    }

    if ("output" in value && value.type === "tool.call") {
      return {
        type: value.type,
        toolName: value.toolName,
        output: this.normalizeJsonObject(value.output),
      };
    }

    if (value.type === "wechat.send_message") {
      return {
        type: value.type,
        conversationId: value.conversationId,
        content: value.content,
        metadata: this.normalizeJsonObject(value.metadata),
      };
    }

    if ("liked" in value && value.type === "wechat.moments.like") {
      return {
        type: value.type,
        postId: value.postId,
        liked: value.liked,
      };
    }

    if ("commentId" in value && value.type === "wechat.moments.comment") {
      return {
        type: value.type,
        postId: value.postId,
        commentId: value.commentId,
      };
    }

    if ("postId" in value && value.type === "wechat.moments.create_post") {
      return {
        type: value.type,
        postId: value.postId,
      };
    }

    if (value.type === "tool.call") {
      return {
        type: value.type,
        toolName: value.toolName,
        input: this.normalizeJsonObject(value.input),
      };
    }

    return this.normalizeJsonObject(value);
  }

  private normalizeJsonObject(value: unknown): Prisma.InputJsonObject {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }
}
