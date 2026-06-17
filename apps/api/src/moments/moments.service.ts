import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateMomentInput, CreateMomentCommentInput } from "./moments.schemas.js";
import type { MomentView } from "@myphone/shared";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../infra/prisma.service.js";
import { MomentsAgentService } from "./moments-agent.service.js";

@Injectable()
export class MomentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MomentsAgentService) private readonly momentsAgent: MomentsAgentService,
  ) {}

  async listMoments(userId: string, limit = 30, cursor?: string): Promise<MomentView[]> {
    const posts = await this.prisma.momentPost.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        likes: { orderBy: { createdAt: "asc" } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    return posts.map((post) => this.toView(post));
  }

  async createMoment(userId: string, input: CreateMomentInput): Promise<MomentView> {
    const profile = await this.prisma.wechatProfile.findUnique({ where: { userId } });
    const displayName = profile?.displayName ?? "用户";

    const post = await this.prisma.momentPost.create({
      data: {
        userId,
        authorName: displayName,
        authorAvatar: profile?.avatarUrl ?? null,
        content: input.content,
        imageUrls: input.imageUrls ?? [],
        location: input.location ?? null,
        visibility: input.visibility ?? "public",
        likes: { create: [] },
        comments: { create: [] },
      },
      include: {
        likes: { orderBy: { createdAt: "asc" } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (post.visibility === "public") {
      await this.writeMomentToMemory(userId, post);
    }

    // Fire-and-forget: trigger character agents to decide whether to like/comment
    const imageArray: string[] = Array.isArray(post.imageUrls) ? (post.imageUrls as string[]) : [];
    if (post.visibility === "public") {
      this.momentsAgent.triggerInteractionsForPost(
        userId,
        post.id,
        post.content,
        post.location,
        imageArray.length,
      );
    }

    return this.toView(post);
  }

  private async writeMomentToMemory(
    userId: string,
    post: {
      id: string;
      content: string;
      imageUrls: unknown;
      location: string | null;
      visibility: string;
      createdAt: Date;
    },
  ): Promise<void> {
    const characters = await this.prisma.character.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (characters.length === 0) {
      return;
    }

    const imageArray: string[] = Array.isArray(post.imageUrls) ? (post.imageUrls as string[]) : [];
    const contentPreview = post.content.trim().slice(0, 200);

    const memoryTextParts = [
      `用户发布了一条朋友圈：${contentPreview}`,
      imageArray.length > 0 ? `（配 ${imageArray.length} 张图）` : "",
      post.location ? ` 位置：${post.location}` : "",
    ].filter((part) => part).join("");

    const structured = {
      source: "wechat_moment",
      momentId: post.id,
      content: contentPreview,
      imageCount: imageArray.length,
      location: post.location ?? null,
      visibility: post.visibility,
      postedAt: post.createdAt.toISOString(),
    } satisfies Prisma.InputJsonObject;

    const data = characters.map((character) => ({
      userId,
      characterId: character.id,
      scope: "character_private",
      type: "moment_post",
      content: memoryTextParts,
      sourceApp: "wechat",
      sourceEventId: post.id,
      confidence: 90,
      weight: 70,
      sensitivity: "low",
      visibility: "private",
      structured,
    }));

    await this.prisma.agentMemory.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async deleteMoment(userId: string, postId: string): Promise<void> {
    const post = await this.prisma.momentPost.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post || post.userId !== userId) {
      throw new NotFoundException("动态不存在或无权限");
    }

    await this.prisma.momentPost.delete({ where: { id: postId } });
  }

  async toggleLike(userId: string, postId: string): Promise<MomentView> {
    const post = await this.prisma.momentPost.findUnique({
      where: { id: postId },
      include: { likes: true, comments: { orderBy: { createdAt: "asc" } } },
    });

    if (!post || post.userId !== userId) {
      throw new NotFoundException("动态不存在或无权限");
    }

    const existingLike = post.likes.find((like) => like.userId === userId);

    if (existingLike) {
      await this.prisma.momentLike.delete({ where: { id: existingLike.id } });
    } else {
      const profile = await this.prisma.wechatProfile.findUnique({ where: { userId } });
      const actorName = profile?.displayName ?? "用户";

      await this.prisma.momentLike.create({
        data: {
          postId,
          userId,
          actorName,
        },
      });
    }

    const updated = await this.prisma.momentPost.findUnique({
      where: { id: postId },
      include: {
        likes: { orderBy: { createdAt: "asc" } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!updated) {
      throw new NotFoundException("动态不存在");
    }

    return this.toView(updated);
  }

  async addComment(userId: string, postId: string, input: CreateMomentCommentInput): Promise<MomentView> {
    const post = await this.prisma.momentPost.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post || post.userId !== userId) {
      throw new NotFoundException("动态不存在或无权限");
    }

    const profile = await this.prisma.wechatProfile.findUnique({ where: { userId } });
    const actorName = profile?.displayName ?? "用户";

    await this.prisma.momentComment.create({
      data: {
        postId,
        userId,
        actorName,
        content: input.content,
      },
    });

    const updated = await this.prisma.momentPost.findUnique({
      where: { id: postId },
      include: {
        likes: { orderBy: { createdAt: "asc" } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!updated) {
      throw new NotFoundException("动态不存在");
    }

    return this.toView(updated);
  }

  async deleteComment(userId: string, postId: string, commentId: string): Promise<MomentView> {
    const comment = await this.prisma.momentComment.findUnique({
      where: { id: commentId },
      select: {
        postId: true,
        userId: true,
        post: {
          select: { userId: true },
        },
      },
    });

    const canDelete = comment?.userId === userId || comment?.post.userId === userId;

    if (!comment || comment.postId !== postId || !canDelete) {
      throw new BadRequestException("评论不存在或无权限");
    }

    await this.prisma.momentComment.delete({ where: { id: commentId } });

    const updated = await this.prisma.momentPost.findUnique({
      where: { id: postId },
      include: {
        likes: { orderBy: { createdAt: "asc" } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!updated) {
      throw new NotFoundException("动态不存在");
    }

    return this.toView(updated);
  }

  private toView(
    post: {
      id: string;
      userId: string;
      characterId: string | null;
      authorType: string;
      authorName: string;
      authorAvatar: string | null;
      content: string;
      imageUrls: unknown;
      location: string | null;
      visibility: string;
      likesCount: number;
      commentsCount: number;
      createdAt: Date;
      updatedAt: Date;
    } & {
      likes: Array<{ id: string; userId: string | null; actorName: string; createdAt: Date }>;
      comments: Array<{
        id: string;
        userId: string | null;
        characterId: string | null;
        actorName: string;
        content: string;
        createdAt: Date;
      }>;
    },
  ): MomentView {
    const imageArray: string[] = Array.isArray(post.imageUrls) ? (post.imageUrls as string[]) : [];
    return {
      id: post.id,
      userId: post.userId,
      characterId: post.characterId,
      authorType: post.authorType as "user" | "character",
      authorName: post.authorName,
      authorAvatar: post.authorAvatar,
      content: post.content,
      imageUrls: imageArray,
      location: post.location,
      visibility: post.visibility as "public" | "private" | "friends",
      likes: post.likes.map((like) => ({
        id: like.id,
        actorName: like.actorName,
        createdAt: like.createdAt.toISOString(),
      })),
      comments: post.comments.map((comment) => ({
        id: comment.id,
        userId: comment.userId,
        characterId: comment.characterId,
        actorName: comment.actorName,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      })),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
