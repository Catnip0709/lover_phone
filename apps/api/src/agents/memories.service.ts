import { Inject, Injectable } from "@nestjs/common";
import type { AgentMemoryView, AgentApp } from "@myphone/shared";
import { PrismaService } from "../infra/prisma.service.js";

type MemoryListFilter = {
  userId: string;
  characterId?: string;
  app?: string;
  type?: string;
  scope?: string;
  keyword?: string;
  isPinned?: boolean;
  page?: number;
  pageSize?: number;
};

type PaginationResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class MemoriesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async listMemories(filter: MemoryListFilter): Promise<{ data: AgentMemoryView[]; pagination: PaginationResult }> {
    const page = filter.page ?? 1;
    const pageSize = Math.min(filter.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      userId: filter.userId,
      enabled: true,
    };

    if (filter.characterId) {
      where.characterId = filter.characterId;
    }

    if (filter.app) {
      where.sourceApp = filter.app;
    }

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.scope) {
      where.scope = filter.scope;
    }

    if (filter.isPinned !== undefined) {
      where.isPinned = filter.isPinned;
    }

    if (filter.keyword) {
      where.content = { contains: filter.keyword };
    }

    const [memories, total] = await Promise.all([
      this.prisma.agentMemory.findMany({
        where,
        orderBy: [
          { isPinned: "desc" },
          { weight: "desc" },
          { updatedAt: "desc" },
        ],
        skip,
        take: pageSize,
      }),
      this.prisma.agentMemory.count({ where }),
    ]);

    return {
      data: memories.map((m) => this.toMemoryView(m)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getMemory(userId: string, memoryId: string): Promise<AgentMemoryView | null> {
    const memory = await this.prisma.agentMemory.findFirst({
      where: {
        id: memoryId,
        userId,
        enabled: true,
      },
    });

    return memory ? this.toMemoryView(memory) : null;
  }

  async createMemory(input: {
    userId: string;
    characterId: string;
    type: string;
    content: string;
    weight?: number;
    visibility?: string;
    isPinned?: boolean;
    tags?: string[];
    expiresAt?: string | null;
    createdBy?: string;
    sourceApp?: string;
  }): Promise<AgentMemoryView> {
    const memory = await this.prisma.agentMemory.create({
      data: {
        userId: input.userId,
        characterId: input.characterId,
        type: input.type,
        content: input.content,
        weight: input.weight ?? 50,
        visibility: input.visibility ?? "private",
        isPinned: input.isPinned ?? false,
        tags: input.tags ?? [],
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdBy: input.createdBy ?? "user",
        sourceApp: input.sourceApp ?? "system",
        scope: "character_private",
        structured: {},
        confidence: 100,
        sensitivity: "medium",
        sourceEventId: null,
      },
    });

    return this.toMemoryView(memory);
  }

  async updateMemory(
    userId: string,
    memoryId: string,
    patch: {
      content?: string;
      weight?: number;
      visibility?: string;
      isPinned?: boolean;
      tags?: string[];
      expiresAt?: string | null;
    }
  ): Promise<AgentMemoryView | null> {
    const existing = await this.prisma.agentMemory.findFirst({
      where: {
        id: memoryId,
        userId,
        enabled: true,
      },
    });

    if (!existing) {
      return null;
    }

    const updateData: Record<string, unknown> = {};

    if (patch.content !== undefined) {
      updateData.content = patch.content;
    }

    if (patch.weight !== undefined) {
      updateData.weight = Math.max(0, Math.min(100, Math.round(patch.weight)));
    }

    if (patch.visibility !== undefined) {
      updateData.visibility = patch.visibility;
    }

    if (patch.isPinned !== undefined) {
      updateData.isPinned = patch.isPinned;
    }

    if (patch.tags !== undefined) {
      updateData.tags = patch.tags;
    }

    if (patch.expiresAt !== undefined) {
      updateData.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
    }

    const updated = await this.prisma.agentMemory.update({
      where: { id: memoryId },
      data: updateData,
    });

    return this.toMemoryView(updated);
  }

  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    const existing = await this.prisma.agentMemory.findFirst({
      where: {
        id: memoryId,
        userId,
        enabled: true,
      },
    });

    if (!existing) {
      return false;
    }

    // Soft delete
    await this.prisma.agentMemory.update({
      where: { id: memoryId },
      data: { enabled: false },
    });

    return true;
  }

  async getStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byApp: Record<string, number>;
    byCharacter: Record<string, number>;
    byVisibility: Record<string, number>;
    recentTrend: Array<{ date: string; count: number }>;
    topMemories: Array<{ id: string; content: string; useCount: number }>;
  }> {
    const memories = await this.prisma.agentMemory.findMany({
      where: { userId, enabled: true },
    });

    const byType: Record<string, number> = {};
    const byApp: Record<string, number> = {};
    const byCharacter: Record<string, number> = {};
    const byVisibility: Record<string, number> = {};

    for (const memory of memories) {
      byType[memory.type] = (byType[memory.type] ?? 0) + 1;
      byApp[memory.sourceApp] = (byApp[memory.sourceApp] ?? 0) + 1;
      byCharacter[memory.characterId] = (byCharacter[memory.characterId] ?? 0) + 1;
      byVisibility[memory.visibility] = (byVisibility[memory.visibility] ?? 0) + 1;
    }

    // Recent trend (last 7 days)
    const recentTrend: Array<{ date: string; count: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = memories.filter((m) => {
        const memDate = new Date(m.createdAt).toISOString().split("T")[0];
        return memDate === dateStr;
      }).length;
      recentTrend.push({ date: dateStr, count });
    }

    // Top memories by mergeCount
    const topMemories = memories
      .map((m) => {
        const structured = this.normalizeStructured(m.structured);
        const mergeCount = typeof structured.mergeCount === "number" ? structured.mergeCount : 0;
        return {
          id: m.id,
          content: m.content,
          useCount: mergeCount,
        };
      })
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 5);

    return {
      total: memories.length,
      byType,
      byApp,
      byCharacter,
      byVisibility,
      recentTrend,
      topMemories,
    };
  }

  async exportMemories(userId: string): Promise<{
    version: string;
    exportedAt: string;
    memories: Array<{
      type: string;
      content: string;
      weight: number;
      visibility: string;
      isPinned: boolean;
      tags: string[];
      expiresAt: string | null;
      createdBy: string;
      createdAt: string;
    }>;
  }> {
    const memories = await this.prisma.agentMemory.findMany({
      where: { userId, enabled: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      memories: memories.map((m) => ({
        type: m.type,
        content: m.content,
        weight: m.weight,
        visibility: m.visibility,
        isPinned: m.isPinned,
        tags: m.tags,
        expiresAt: m.expiresAt?.toISOString() ?? null,
        createdBy: m.createdBy,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async importMemories(userId: string, data: {
    characterId?: string;
    memories: Array<{
      type: string;
      content: string;
      weight?: number;
      visibility?: string;
      isPinned?: boolean;
      tags?: string[];
      expiresAt?: string | null;
      createdBy?: string;
    }>;
  }): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const targetCharacterId = data.characterId ?? "";

    for (const mem of data.memories) {
      try {
        // Check if memory with same content exists
        const existing = await this.prisma.agentMemory.findFirst({
          where: {
            userId,
            content: mem.content,
            enabled: true,
          },
        });

        if (existing) {
          // If weight is higher, update existing
          if (mem.weight !== undefined && mem.weight > existing.weight) {
            await this.prisma.agentMemory.update({
              where: { id: existing.id },
              data: { weight: mem.weight },
            });
          }
          skipped++;
        } else if (targetCharacterId) {
          // Create new memory only if characterId is provided
          await this.prisma.agentMemory.create({
            data: {
              userId,
              characterId: targetCharacterId,
              type: mem.type,
              content: mem.content,
              weight: mem.weight ?? 50,
              visibility: mem.visibility ?? "private",
              isPinned: mem.isPinned ?? false,
              tags: mem.tags ?? [],
              expiresAt: mem.expiresAt ? new Date(mem.expiresAt) : null,
              createdBy: mem.createdBy ?? "imported",
              sourceApp: "system",
              scope: "character_private",
              structured: {},
              confidence: 100,
              sensitivity: "medium",
              sourceEventId: null,
            },
          });
          imported++;
        } else {
          errors.push(`Skipped: characterId is required for new memories`);
        }
      } catch (err) {
        errors.push(`Failed to import: ${mem.content}`);
      }
    }

    return { imported, skipped, errors };
  }

  async clearAllMemories(userId: string): Promise<{ deleted: number }> {
    const result = await this.prisma.agentMemory.updateMany({
      where: { userId, enabled: true },
      data: { enabled: false },
    });

    return { deleted: result.count };
  }

  private toMemoryView(memory: {
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
    isPinned: boolean;
    tags: string[];
    expiresAt: Date | null;
    createdBy: string;
  }): AgentMemoryView {
    return {
      id: memory.id,
      userId: memory.userId,
      characterId: memory.characterId,
      scope: memory.scope as AgentMemoryView["scope"],
      type: memory.type,
      content: memory.content,
      structured: this.normalizeStructured(memory.structured),
      sourceApp: memory.sourceApp as AgentApp,
      sourceEventId: memory.sourceEventId,
      confidence: memory.confidence,
      weight: memory.weight,
      sensitivity: memory.sensitivity as AgentMemoryView["sensitivity"],
      visibility: memory.visibility as AgentMemoryView["visibility"],
      enabled: memory.enabled,
      lastUsedAt: memory.lastUsedAt?.toISOString() ?? null,
      createdAt: memory.createdAt.toISOString(),
      updatedAt: memory.updatedAt.toISOString(),
      isPinned: memory.isPinned,
      tags: memory.tags,
      expiresAt: memory.expiresAt?.toISOString() ?? null,
      createdBy: memory.createdBy,
    };
  }

  private normalizeStructured(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
