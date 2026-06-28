import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AgentMemoryView } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { MemoriesService } from "./memories.service.js";

@Controller("memories")
@UseGuards(JwtAuthGuard)
export class MemoriesController {
  constructor(
    @Inject(MemoriesService)
    private readonly memoriesService: MemoriesService,
  ) {}

  @Get()
  async listMemories(
    @Req() request: AuthenticatedRequest,
    @Query("characterId") characterId?: string,
    @Query("app") app?: string,
    @Query("type") type?: string,
    @Query("scope") scope?: string,
    @Query("keyword") keyword?: string,
    @Query("isPinned") isPinned?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const userId = this.getUserId(request);

    return this.memoriesService.listMemories({
      userId,
      characterId,
      app,
      type,
      scope,
      keyword,
      isPinned: isPinned === "true" ? true : isPinned === "false" ? false : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(":id")
  async getMemory(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<AgentMemoryView> {
    const userId = this.getUserId(request);
    const memory = await this.memoriesService.getMemory(userId, id);

    if (!memory) {
      throw new NotFoundException({
        error: {
          code: "MEMORY_NOT_FOUND",
          message: `Memory with id ${id} not found`,
        },
      });
    }

    return memory;
  }

  @Post()
  async createMemory(
    @Req() request: AuthenticatedRequest,
    @Body() body: {
      characterId: string;
      type: string;
      content: string;
      weight?: number;
      visibility?: string;
      isPinned?: boolean;
      tags?: string[];
      expiresAt?: string | null;
    },
  ): Promise<AgentMemoryView> {
    const userId = this.getUserId(request);

    if (!body.characterId) {
      throw new Error("characterId is required");
    }

    if (!body.type) {
      throw new Error("type is required");
    }

    if (!body.content?.trim()) {
      throw new Error("content is required");
    }

    return this.memoriesService.createMemory({
      userId,
      characterId: body.characterId,
      type: body.type,
      content: body.content.trim(),
      weight: body.weight,
      visibility: body.visibility,
      isPinned: body.isPinned,
      tags: body.tags,
      expiresAt: body.expiresAt,
      createdBy: "user",
      sourceApp: "system",
    });
  }

  @Patch(":id")
  async updateMemory(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: {
      content?: string;
      weight?: number;
      visibility?: string;
      isPinned?: boolean;
      tags?: string[];
      expiresAt?: string | null;
    },
  ): Promise<AgentMemoryView> {
    const userId = this.getUserId(request);
    const memory = await this.memoriesService.updateMemory(userId, id, body);

    if (!memory) {
      throw new NotFoundException({
        error: {
          code: "MEMORY_NOT_FOUND",
          message: `Memory with id ${id} not found`,
        },
      });
    }

    return memory;
  }

  @Delete(":id")
  async deleteMemory(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<{ success: boolean }> {
    const userId = this.getUserId(request);
    const success = await this.memoriesService.deleteMemory(userId, id);

    if (!success) {
      throw new NotFoundException({
        error: {
          code: "MEMORY_NOT_FOUND",
          message: `Memory with id ${id} not found`,
        },
      });
    }

    return { success: true };
  }

  @Get("stats")
  async getStats(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);
    return this.memoriesService.getStats(userId);
  }

  @Post("export")
  async exportMemories(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);
    return this.memoriesService.exportMemories(userId);
  }

  @Post("import")
  async importMemories(
    @Req() request: AuthenticatedRequest,
    @Body() body: {
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
    },
  ) {
    const userId = this.getUserId(request);
    return this.memoriesService.importMemories(userId, body);
  }

  @Delete("clear")
  async clearAllMemories(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);
    return this.memoriesService.clearAllMemories(userId);
  }

  private getUserId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }
    return request.user.id;
  }
}
