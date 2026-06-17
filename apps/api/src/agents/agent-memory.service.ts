import { Inject, Injectable } from "@nestjs/common";
import type {
  AgentApp,
  AgentMemoryDraft,
  AgentMemorySensitivity,
  AgentMemoryView,
  AgentVisibility,
  MemoryView,
} from "@myphone/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../infra/prisma.service.js";
import { AgentPolicyService } from "./agent-policy.service.js";

type MemoryCandidate = {
  type: string;
  content: string;
  weight: number;
  confidence: number;
  sensitivity: AgentMemorySensitivity;
  visibility: AgentVisibility;
  structured: Record<string, unknown>;
};

@Injectable()
export class AgentMemoryService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(AgentPolicyService)
    private readonly agentPolicy: AgentPolicyService,
  ) {}

  async retrieveForChat(input: { userId: string; characterId: string; limit?: number }): Promise<MemoryView[]> {
    const limit = input.limit ?? 8;
    const memories = await this.prisma.agentMemory.findMany({
      where: {
        userId: input.userId,
        characterId: input.characterId,
        enabled: true,
        visibility: { in: ["private", "public"] },
      },
      orderBy: [{ weight: "desc" }, { confidence: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    if (memories.length > 0) {
      await this.prisma.agentMemory
        .updateMany({
          where: { id: { in: memories.map((memory) => memory.id) } },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);
    }

    return this.withLegacyFallback({
      userId: input.userId,
      characterId: input.characterId,
      limit,
      memories: memories.map(this.toCompatibleMemoryView),
    });
  }

  async retrieveForPublicContext(input: { userId: string; characterId: string; limit?: number }): Promise<MemoryView[]> {
    const limit = input.limit ?? 6;
    const memories = await this.prisma.agentMemory.findMany({
      where: {
        userId: input.userId,
        characterId: input.characterId,
        enabled: true,
        visibility: "public",
        sensitivity: "low",
      },
      orderBy: [{ weight: "desc" }, { confidence: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    if (memories.length > 0) {
      await this.prisma.agentMemory
        .updateMany({
          where: { id: { in: memories.map((memory) => memory.id) } },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => undefined);
    }

    return memories.map(this.toCompatibleMemoryView);
  }

  async listForProfile(input: { userId: string; characterId: string; limit?: number }): Promise<MemoryView[]> {
    const limit = input.limit ?? 20;
    const memories = await this.prisma.agentMemory.findMany({
      where: {
        userId: input.userId,
        characterId: input.characterId,
        enabled: true,
      },
      orderBy: [{ weight: "desc" }, { confidence: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return this.withLegacyFallback({
      userId: input.userId,
      characterId: input.characterId,
      limit,
      memories: memories.map(this.toCompatibleMemoryView),
    });
  }

  async captureFromWechatMessage(input: {
    userId: string;
    characterId: string;
    sourceEventId: string | null;
    sourceMessageId: string | null;
    content: string;
  }): Promise<MemoryView[]> {
    const candidates = this.extractMemoryCandidates(input.content);
    const memories: MemoryView[] = [];

    for (const candidate of candidates) {
      const memory = await this.writeOrMerge({
        userId: input.userId,
        characterId: input.characterId,
        sourceApp: "wechat",
        sourceEventId: input.sourceEventId,
        sourceMessageId: input.sourceMessageId,
        candidate,
      });
      memories.push(this.toCompatibleMemoryView(memory));
    }

    return memories;
  }

  async writeDraft(input: { userId: string; characterId: string; memory: AgentMemoryDraft }): Promise<AgentMemoryView> {
    const memoryDraft = this.agentPolicy.normalizeMemoryDraft({
      memory: input.memory,
      app: input.memory.sourceApp,
    });
    const memory = await this.writeOrMerge({
      userId: input.userId,
      characterId: input.characterId,
      sourceApp: memoryDraft.sourceApp,
      sourceEventId: memoryDraft.sourceEventId ?? null,
      sourceMessageId:
        typeof memoryDraft.structured?.sourceMessageId === "string" ? memoryDraft.structured.sourceMessageId : null,
      candidate: {
        type: memoryDraft.type,
        content: memoryDraft.content,
        weight: this.clampScore(memoryDraft.weight ?? 50),
        confidence: this.clampScore(memoryDraft.confidence ?? 70),
        sensitivity: memoryDraft.sensitivity ?? "low",
        visibility: memoryDraft.visibility ?? "private",
        structured: memoryDraft.structured ?? {},
      },
    });

    return this.toAgentMemoryView(memory);
  }

  async mergePatch(input: { userId: string; characterId: string; memoryId: string; patch: Record<string, unknown> }) {
    const existing = await this.prisma.agentMemory.findFirst({
      where: {
        id: input.memoryId,
        userId: input.userId,
        characterId: input.characterId,
        enabled: true,
      },
    });

    if (!existing) {
      return null;
    }

    const patchWeight = typeof input.patch.weight === "number" ? this.clampScore(input.patch.weight) : existing.weight;
    const patchConfidence =
      typeof input.patch.confidence === "number" ? this.clampScore(input.patch.confidence) : existing.confidence;
    const patchContent = typeof input.patch.content === "string" && input.patch.content.trim() ? input.patch.content : existing.content;

    const updated = await this.prisma.agentMemory.update({
      where: { id: existing.id },
      data: {
        content: patchContent,
        weight: patchWeight,
        confidence: patchConfidence,
        structured: {
          ...this.normalizeStructured(existing.structured),
          patch: input.patch as Prisma.InputJsonObject,
          patchedAt: new Date().toISOString(),
        } satisfies Prisma.InputJsonObject,
      },
    });

    return this.toAgentMemoryView(updated);
  }

  toAgentMemoryView(memory: {
    id: string;
    userId: string;
    characterId: string;
    scope: string;
    type: string;
    content: string;
    structured: unknown;
    sourceApp: string;
    sourceEventId: string | null;
    confidence: number;
    weight: number;
    sensitivity: string;
    visibility: string;
    enabled: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AgentMemoryView {
    return {
      id: memory.id,
      userId: memory.userId,
      characterId: memory.characterId,
      scope: this.asAgentMemoryScope(memory.scope),
      type: memory.type,
      content: memory.content,
      structured: this.normalizeStructured(memory.structured),
      sourceApp: memory.sourceApp as AgentApp,
      sourceEventId: memory.sourceEventId,
      confidence: memory.confidence,
      weight: memory.weight,
      sensitivity: this.asSensitivity(memory.sensitivity),
      visibility: this.asVisibility(memory.visibility),
      enabled: memory.enabled,
      lastUsedAt: memory.lastUsedAt?.toISOString() ?? null,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
    };
  }

  private async writeOrMerge(input: {
    userId: string;
    characterId: string;
    sourceApp: AgentApp;
    sourceEventId: string | null;
    sourceMessageId: string | null;
    candidate: MemoryCandidate;
  }) {
    const existing = await this.prisma.agentMemory.findFirst({
      where: {
        userId: input.userId,
        characterId: input.characterId,
        enabled: true,
        type: input.candidate.type,
        content: input.candidate.content,
      },
    });

    const sourcePatch = {
      ...input.candidate.structured,
      sourceMessageId: input.sourceMessageId,
      extraction: "rule",
      mergedAt: new Date().toISOString(),
    } satisfies Prisma.InputJsonObject;

    if (existing) {
      return this.prisma.agentMemory.update({
        where: { id: existing.id },
        data: {
          weight: Math.min(100, existing.weight + 8),
          confidence: Math.max(existing.confidence, input.candidate.confidence),
          sourceApp: input.sourceApp,
          sourceEventId: input.sourceEventId,
          structured: {
            ...this.normalizeStructured(existing.structured),
            ...sourcePatch,
            mergeCount: this.getMergeCount(existing.structured) + 1,
          } satisfies Prisma.InputJsonObject,
        },
      });
    }

    return this.prisma.agentMemory.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        scope: "character_private",
        type: input.candidate.type,
        content: input.candidate.content,
        structured: {
          ...sourcePatch,
          mergeCount: 1,
        } satisfies Prisma.InputJsonObject,
        sourceApp: input.sourceApp,
        sourceEventId: input.sourceEventId,
        confidence: input.candidate.confidence,
        weight: input.candidate.weight,
        sensitivity: input.candidate.sensitivity,
        visibility: input.candidate.visibility,
      },
    });
  }

  private extractMemoryCandidates(content: string): MemoryCandidate[] {
    const candidates: MemoryCandidate[] = [];
    const normalized = content.replace(/\s+/g, " ").trim();

    const rules: Array<{
      type: string;
      weight: number;
      confidence: number;
      sensitivity: AgentMemorySensitivity;
      visibility: AgentVisibility;
      pattern: RegExp;
      format: (match: RegExpMatchArray) => string;
      structured: (match: RegExpMatchArray) => Record<string, unknown>;
    }> = [
      {
        type: "user_profile",
        weight: 92,
        confidence: 88,
        sensitivity: "medium",
        visibility: "private",
        pattern: /我(?:叫|是)([\u4e00-\u9fa5A-Za-z0-9_-]{1,20})/,
        format: (match) => `用户名字/称呼是「${match[1]}」`,
        structured: (match) => ({ field: "name", value: match[1] }),
      },
      {
        type: "user_preference",
        weight: 78,
        confidence: 82,
        sensitivity: "low",
        visibility: "private",
        pattern: /我喜欢([^，。！？,.!?]{1,30})/,
        format: (match) => `用户喜欢${match[1]}`,
        structured: (match) => ({ field: "preference", polarity: "positive", value: match[1] }),
      },
      {
        type: "user_preference",
        weight: 78,
        confidence: 82,
        sensitivity: "low",
        visibility: "private",
        pattern: /我不喜欢([^，。！？,.!?]{1,30})/,
        format: (match) => `用户不喜欢${match[1]}`,
        structured: (match) => ({ field: "preference", polarity: "negative", value: match[1] }),
      },
      {
        type: "user_profile",
        weight: 70,
        confidence: 70,
        sensitivity: "medium",
        visibility: "private",
        pattern: /我(?:住在|在)([\u4e00-\u9fa5A-Za-z]{2,20})(?:生活|工作|上班|读书)?/,
        format: (match) => `用户所在城市/地点可能是「${match[1]}」`,
        structured: (match) => ({ field: "location", value: match[1] }),
      },
      {
        type: "user_profile",
        weight: 88,
        confidence: 84,
        sensitivity: "medium",
        visibility: "private",
        pattern: /(?:生日|出生)(?:是|在)?([0-9]{1,2}月[0-9]{1,2}日|[0-9]{4}-[0-9]{1,2}-[0-9]{1,2})/,
        format: (match) => `用户生日是「${match[1]}」`,
        structured: (match) => ({ field: "birthday", value: match[1] }),
      },
      {
        type: "emotion_pattern",
        weight: 62,
        confidence: 66,
        sensitivity: "medium",
        visibility: "private",
        pattern: /我今天([^，。！？,.!?]{1,30})(?:难过|开心|累|焦虑|失眠|委屈)/,
        format: () => `用户近期情绪状态：${normalized.slice(0, 60)}`,
        structured: () => ({ field: "recent_emotion", value: normalized.slice(0, 80) }),
      },
      {
        type: "promise",
        weight: 84,
        confidence: 76,
        sensitivity: "low",
        visibility: "private",
        pattern: /(?:记得|提醒我|别忘了)([^，。！？,.!?]{1,40})/,
        format: (match) => `用户希望被记住/提醒：${match[1]}`,
        structured: (match) => ({ field: "promise", value: match[1] }),
      },
    ];

    for (const rule of rules) {
      const match = normalized.match(rule.pattern);
      if (match) {
        candidates.push({
          type: rule.type,
          content: rule.format(match),
          weight: rule.weight,
          confidence: rule.confidence,
          sensitivity: rule.sensitivity,
          visibility: rule.visibility,
          structured: rule.structured(match),
        });
      }
    }

    return candidates.slice(0, 3);
  }

  private toCompatibleMemoryView = (memory: {
    id: string;
    characterId: string;
    content: string;
    type: string;
    structured: unknown;
    weight: number;
    enabled: boolean;
    sourceEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MemoryView => {
    const structured = this.normalizeStructured(memory.structured);
    const sourceMessageId = typeof structured.sourceMessageId === "string" ? structured.sourceMessageId : memory.sourceEventId;

    return {
      id: memory.id,
      characterId: memory.characterId,
      content: memory.content,
      type: memory.type,
      weight: memory.weight,
      enabled: memory.enabled,
      sourceMessageId,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
    };
  };

  private async withLegacyFallback(input: {
    userId: string;
    characterId: string;
    limit: number;
    memories: MemoryView[];
  }): Promise<MemoryView[]> {
    if (input.memories.length >= input.limit) {
      return input.memories;
    }

    const legacyMemories = await this.prisma.memory.findMany({
      where: {
        userId: input.userId,
        characterId: input.characterId,
        enabled: true,
      },
      orderBy: [{ weight: "desc" }, { updatedAt: "desc" }],
      take: input.limit,
    });
    const existingContents = new Set(input.memories.map((memory) => memory.content));
    const fallbackMemories = legacyMemories
      .filter((memory) => !existingContents.has(memory.content))
      .map((memory) => ({
        id: memory.id,
        characterId: memory.characterId,
        content: memory.content,
        type: memory.type,
        weight: memory.weight,
        enabled: memory.enabled,
        sourceMessageId: memory.sourceMessageId,
        createdAt: memory.createdAt.toISOString(),
        updatedAt: memory.updatedAt.toISOString(),
      }));

    return input.memories.concat(fallbackMemories).slice(0, input.limit);
  }

  private normalizeStructured(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private getMergeCount(value: unknown): number {
    const structured = this.normalizeStructured(value);
    return typeof structured.mergeCount === "number" && Number.isFinite(structured.mergeCount) ? structured.mergeCount : 0;
  }

  private clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private asAgentMemoryScope(scope: string): AgentMemoryView["scope"] {
    return scope === "user_global" || scope === "app_private" || scope === "public" ? scope : "character_private";
  }

  private asSensitivity(sensitivity: string): AgentMemorySensitivity {
    return sensitivity === "medium" || sensitivity === "high" ? sensitivity : "low";
  }

  private asVisibility(visibility: string): AgentVisibility {
    return visibility === "public" || visibility === "system" ? visibility : "private";
  }
}
