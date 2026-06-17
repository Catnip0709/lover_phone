import { Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { MomentView } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { MomentsService } from "./moments.service.js";
import { createMomentCommentSchema, createMomentSchema } from "./moments.schemas.js";

@Controller("wechat/moments")
@UseGuards(JwtAuthGuard)
export class MomentsController {
  constructor(@Inject(MomentsService) private readonly moments: MomentsService) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ): Promise<{ items: MomentView[] }> {
    const items = await this.moments.listMoments(
      this.userId(request),
      limit ? Math.min(Math.max(Number(limit), 1), 100) : 30,
      cursor,
    );
    return { items };
  }

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<MomentView> {
    const input = parseBody(createMomentSchema, body);
    return this.moments.createMoment(this.userId(request), input);
  }

  @Delete(":id")
  async remove(@Req() request: AuthenticatedRequest, @Param("id") postId: string): Promise<{ ok: true }> {
    await this.moments.deleteMoment(this.userId(request), postId);
    return { ok: true };
  }

  @Post(":id/like")
  async like(@Req() request: AuthenticatedRequest, @Param("id") postId: string): Promise<MomentView> {
    return this.moments.toggleLike(this.userId(request), postId);
  }

  @Post(":id/comments")
  async addComment(
    @Req() request: AuthenticatedRequest,
    @Param("id") postId: string,
    @Body() body: unknown,
  ): Promise<MomentView> {
    const input = parseBody(createMomentCommentSchema, body);
    return this.moments.addComment(this.userId(request), postId, input);
  }

  @Delete(":id/comments/:commentId")
  async removeComment(
    @Req() request: AuthenticatedRequest,
    @Param("id") postId: string,
    @Param("commentId") commentId: string,
  ): Promise<MomentView> {
    return this.moments.deleteComment(this.userId(request), postId, commentId);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }
    return request.user.id;
  }
}
