import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { WechatProfileView } from "@myphone/shared";
import { PrismaService } from "../infra/prisma.service.js";

@Injectable()
export class WechatProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<WechatProfileView> {
    let profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, nickname: true },
      });

      if (!user) {
        throw new NotFoundException("用户不存在");
      }

      profile = await this.prisma.wechatProfile.create({
        data: {
          userId,
          displayName: user.nickname ?? user.username,
          avatarUrl: null,
          wechatId: null,
          bio: null,
          region: null,
          walletBalanceCents: 0,
          defaultMomentVisibility: "public",
        },
      });
    }

    return this.toView(profile);
  }

  async updateProfile(userId: string, input: {
    displayName?: string;
    avatarUrl?: string | null;
    bio?: string | null;
    region?: string | null;
    wechatId?: string | null;
    defaultMomentVisibility?: string;
  }): Promise<WechatProfileView> {
    let profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return this.getProfile(userId);
    }

    const updateData: {
      displayName?: string;
      avatarUrl?: string | null;
      bio?: string | null;
      region?: string | null;
      wechatId?: string | null;
      defaultMomentVisibility?: string;
    } = {};

    if (input.displayName !== undefined) {
      if (!input.displayName.trim()) {
        throw new BadRequestException("显示名称不能为空");
      }
      updateData.displayName = input.displayName.trim();
    }
    if (input.avatarUrl !== undefined) {
      updateData.avatarUrl = input.avatarUrl?.trim() || null;
    }
    if (input.bio !== undefined) {
      updateData.bio = input.bio?.trim() || null;
    }
    if (input.region !== undefined) {
      updateData.region = input.region?.trim() || null;
    }
    if (input.wechatId !== undefined) {
      updateData.wechatId = input.wechatId?.trim() || null;
    }
    if (input.defaultMomentVisibility !== undefined) {
      if (!["public", "private", "partial"].includes(input.defaultMomentVisibility)) {
        throw new BadRequestException("无效的可见范围");
      }
      updateData.defaultMomentVisibility = input.defaultMomentVisibility;
    }

    const updated = await this.prisma.wechatProfile.update({
      where: { userId },
      data: updateData,
    });

    return this.toView(updated);
  }

  private toView(profile: {
    id: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    wechatId: string | null;
    bio: string | null;
    region: string | null;
    walletBalanceCents: number;
    defaultMomentVisibility: string;
    createdAt: Date;
    updatedAt: Date;
  }): WechatProfileView {
    return {
      id: profile.id,
      userId: profile.userId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      wechatId: profile.wechatId,
      bio: profile.bio,
      region: profile.region,
      walletBalanceCents: profile.walletBalanceCents,
      defaultMomentVisibility: profile.defaultMomentVisibility as "public" | "private" | "partial",
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
