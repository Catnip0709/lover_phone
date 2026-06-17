import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import type { ModelProvider } from "@myphone/shared";
import { AgentActionExecutorService } from "../agents/agent-action-executor.service.js";
import { AgentMemoryService } from "../agents/agent-memory.service.js";
import { AgentRuntimeService } from "../agents/agent-runtime.service.js";
import { PrismaService } from "../infra/prisma.service.js";
import { RedisService } from "../infra/redis.service.js";
import { ApiKeyCryptoService } from "../model-configs/api-key-crypto.service.js";

@Injectable()
export class MomentsSchedulingService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AgentRuntimeService)
    private readonly agentRuntime: AgentRuntimeService,
    @Inject(AgentActionExecutorService)
    private readonly agentActionExecutor: AgentActionExecutorService,
    @Inject(AgentMemoryService)
    private readonly agentMemory: AgentMemoryService,
    @Inject(RedisService)
    private readonly redis: RedisService,
    @Inject(ApiKeyCryptoService)
    private readonly apiKeyCrypto: ApiKeyCryptoService,
  ) {}

  onModuleInit() {
    this.startScheduling();
  }

  onModuleDestroy() {
    this.stopScheduling();
  }

  private startScheduling() {
    if (this.intervalId || this.timeoutId) return;

    const now = new Date();
    const delayToNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;

    this.timeoutId = setTimeout(() => {
      this.timeoutId = null;
      this.triggerScheduledPosting().catch((error) => {
        console.error("[MomentsScheduler] Initial trigger failed:", error);
      });

      this.intervalId = setInterval(() => {
        this.triggerScheduledPosting().catch((error) => {
          console.error("[MomentsScheduler] Scheduled trigger failed:", error);
        });
      }, 60 * 60 * 1000);
    }, delayToNextHour);
  }

  private stopScheduling() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async triggerScheduledPosting(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    for (const user of users) {
      await this.processUserCharacters(user.id).catch((error) => {
        console.error(`[MomentsScheduler] Failed to process user ${user.id}:`, error);
      });
    }
  }

  private async processUserCharacters(userId: string): Promise<void> {
    const characters = await this.prisma.character.findMany({
      where: { userId, deletedAt: null, isActive: true },
    });

    for (const character of characters) {
      await this.processCharacterPosting(userId, character.id).catch((error) => {
        console.error(`[MomentsScheduler] Failed to process character ${character.id}:`, error);
      });
    }
  }

  private async processCharacterPosting(userId: string, characterId: string): Promise<void> {
    const scheduleHour = this.scheduleHourKey(new Date());
    const lockKey = `moments:character-post:${userId}:${characterId}:${scheduleHour}`;
    const lockAcquired = await this.redis.setNx(lockKey, String(Date.now()), 65 * 60).catch(() => false);
    if (!lockAcquired) {
      return;
    }

    const lastPost = await this.prisma.momentPost.findFirst({
      where: { userId, characterId, authorType: "character" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const now = Date.now();
    const minIntervalMs = 4 * 60 * 60 * 1000;
    if (lastPost && now - lastPost.createdAt.getTime() < minIntervalMs) {
      return;
    }

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

    const character = await this.prisma.character.findFirst({
      where: { id: characterId, userId, deletedAt: null, isActive: true },
    });
    if (!character) return;

    const memories = await this.agentMemory.retrieveForPublicContext({ userId, characterId, limit: 4 });
    const profile = this.normalizeProfile(character.structuredProfile);
    const relationship = this.normalizeRelationship(profile.relationship);

    try {
      const { decision } = await this.agentRuntime.handleWechatMomentPost({
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
      });

      if (decision.post && decision.content) {
        const alreadyPostedThisHour = await this.hasCharacterPostInHour({
          userId,
          characterId,
          hour: new Date(),
        });
        if (alreadyPostedThisHour) {
          return;
        }

        await this.agentActionExecutor.execute({
          agentRunId: null,
          userId,
          characterId,
          app: "wechat",
          taskType: "moments.post",
          action: {
            type: "wechat.moments.create_post",
            content: decision.content,
            location: decision.location || undefined,
            visibility: "public",
          },
        });
      }
    } catch (error) {
      console.error(`[MomentsScheduler] Character ${characterId} posting failed:`, error);
    }
  }

  private async hasCharacterPostInHour(input: {
    userId: string;
    characterId: string;
    hour: Date;
  }): Promise<boolean> {
    const start = new Date(input.hour);
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    const existing = await this.prisma.momentPost.findFirst({
      where: {
        userId: input.userId,
        characterId: input.characterId,
        authorType: "character",
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  private scheduleHourKey(date: Date): string {
    const hour = new Date(date);
    hour.setMinutes(0, 0, 0);
    return hour.toISOString();
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
