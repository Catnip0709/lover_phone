import { Inject, Injectable } from "@nestjs/common";
import type { ModelProvider } from "@myphone/shared";
import { AgentActionExecutorService } from "../agents/agent-action-executor.service.js";
import { AgentMemoryService } from "../agents/agent-memory.service.js";
import { AgentRuntimeService } from "../agents/agent-runtime.service.js";
import { PrismaService } from "../infra/prisma.service.js";
import { ApiKeyCryptoService } from "../model-configs/api-key-crypto.service.js";

@Injectable()
export class MomentsAgentService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AgentRuntimeService)
    private readonly agentRuntime: AgentRuntimeService,
    @Inject(AgentActionExecutorService)
    private readonly agentActionExecutor: AgentActionExecutorService,
    @Inject(AgentMemoryService)
    private readonly agentMemory: AgentMemoryService,
    @Inject(ApiKeyCryptoService)
    private readonly apiKeyCrypto: ApiKeyCryptoService,
  ) {}

  async triggerInteractionsForPost(
    userId: string,
    postId: string,
    momentContent: string,
    momentLocation: string | null,
    momentImageCount: number,
  ): Promise<void> {
    // Fire-and-forget: trigger interactions for all characters without blocking the response
    this.doTriggerInteractions(userId, postId, momentContent, momentLocation, momentImageCount).catch(
      (error) => {
        console.error(`[MomentsAgent] Failed to trigger interactions for post ${postId}:`, error);
      },
    );
  }

  private async doTriggerInteractions(
    userId: string,
    postId: string,
    momentContent: string,
    momentLocation: string | null,
    momentImageCount: number,
  ): Promise<void> {
    const characters = await this.prisma.character.findMany({
      where: { userId, deletedAt: null, isActive: true },
    });

    for (const character of characters) {
      await this.triggerInteractionForCharacter(
        userId,
        postId,
        character.id,
        momentContent,
        momentLocation,
        momentImageCount,
      );
    }
  }

  private async triggerInteractionForCharacter(
    userId: string,
    postId: string,
    characterId: string,
    momentContent: string,
    momentLocation: string | null,
    momentImageCount: number,
  ): Promise<void> {
    // Check idempotency: skip if character already interacted with this post
    const existingLike = await this.prisma.momentLike.findFirst({
      where: { postId, characterId },
    });
    if (existingLike) {
      // Character already liked this post - skip
      return;
    }

    // Public moments must not receive private chat memories.
    const memories = await this.agentMemory.retrieveForPublicContext({ userId, characterId, limit: 4 });
    const character = await this.prisma.character.findFirst({
      where: { id: characterId, userId, deletedAt: null, isActive: true },
    });
    if (!character) return;

    const profile_ = this.normalizeProfile(character.structuredProfile);
    const relationship = this.normalizeRelationship(profile_.relationship);

    // Find default model config for this user
    const modelConfig = await this.prisma.modelConfig.findFirst({
      where: { userId, isDefault: true },
    });
    if (!modelConfig?.provider || !modelConfig?.modelName) {
      return;
    }

    const apiKey = await this.getApiKey(modelConfig);
    if (!apiKey) {
      return;
    }

    try {
      const { decision } = await this.agentRuntime.handleWechatMomentInteraction({
        userId,
        characterId,
        model: {
          provider: modelConfig.provider as ModelProvider,
          modelName: modelConfig.modelName,
          apiKey,
        },
        character: {
          nickname: character.nickname,
          age: character.age,
          occupation: character.occupation,
          rawCharacterCard: character.rawCharacterCard,
          relationshipStage: character.relationshipStage,
          adultEnabled: character.adultEnabled,
          structuredProfile: character.structuredProfile,
        },
        memories,
        relationship,
        momentContent,
        momentLocation,
        momentImageCount,
      });

      // Execute like action if decided
      if (decision.like) {
        await this.agentActionExecutor.execute({
          agentRunId: null,
          userId,
          characterId,
          app: "wechat",
          taskType: "moments.comment",
          action: { type: "wechat.moments.like", postId },
        });
      }

      // Execute comment action if decided
      if (decision.comment) {
        await this.agentActionExecutor.execute({
          agentRunId: null,
          userId,
          characterId,
          app: "wechat",
          taskType: "moments.comment",
          action: { type: "wechat.moments.comment", postId, content: decision.comment },
        });
      }
    } catch (error) {
      console.error(`[MomentsAgent] Character ${characterId} interaction failed:`, error);
    }
  }

  private async getApiKey(config: { encryptedApiKey: string; apiKeyIv: string; apiKeyAuthTag: string }): Promise<string | null> {
    try {
      return this.apiKeyCrypto.decrypt(config);
    } catch {
      return null;
    }
  }

  private normalizeProfile(profile: unknown): Record<string, unknown> {
    if (typeof profile === "object" && profile !== null && !Array.isArray(profile)) {
      return profile as Record<string, unknown>;
    }
    return {};
  }

  private normalizeRelationship(value: unknown): import("@myphone/shared").RelationshipProgressView {
    const relationship = typeof value === "object" && value !== null ? (value as Partial<import("@myphone/shared").RelationshipProgressView>) : {};
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

  private relationshipStageForScore(score: number): import("@myphone/shared").RelationshipStage {
    if (score >= 75) return "lover";
    if (score >= 45) return "dating";
    if (score >= 20) return "ambiguous";
    return "stranger";
  }

  private relationshipLevelName(stage: import("@myphone/shared").RelationshipStage): string {
    return (
      {
        stranger: "初识",
        ambiguous: "暧昧升温",
        dating: "稳定约会",
        lover: "亲密恋人",
      } satisfies Record<import("@myphone/shared").RelationshipStage, string>
    )[stage];
  }

  private nextLevelScore(score: number): number | null {
    if (score < 20) return 20;
    if (score < 45) return 45;
    if (score < 75) return 75;
    return null;
  }
}
