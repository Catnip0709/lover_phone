import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { WechatProfileView } from "@myphone/shared";
import { PrismaService } from "../infra/prisma.service.js";

type ProfileRow = {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  wechatId: string | null;
  bio: string | null;
  region: string | null;
  walletBalanceCents: number;
  defaultMomentVisibility: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserRow = {
  username: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  region: string | null;
};

@Injectable()
export class WechatProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<WechatProfileView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        nickname: true,
        avatar: true,
        bio: true,
        region: true,
      },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    let profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.wechatProfile.create({
        data: {
          userId,
          displayName: null,
          avatarUrl: null,
          wechatId: null,
          bio: null,
          region: null,
          walletBalanceCents: 0,
          defaultMomentVisibility: "public",
        },
      });
    }

    return this.toView(profile as ProfileRow, user as UserRow);
  }

  async updateProfile(userId: string, input: {
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    region?: string | null;
    wechatId?: string | null;
    defaultMomentVisibility?: string;
  }): Promise<WechatProfileView> {
    const existing = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      return this.getProfile(userId);
    }

    const updateData: {
      displayName?: string | null;
      avatarUrl?: string | null;
      bio?: string | null;
      region?: string | null;
      wechatId?: string | null;
      defaultMomentVisibility?: string;
    } = {};

    if (input.displayName !== undefined) {
      updateData.displayName = normalizeOptional(input.displayName);
    }
    if (input.avatarUrl !== undefined) {
      updateData.avatarUrl = normalizeOptional(input.avatarUrl);
    }
    if (input.bio !== undefined) {
      updateData.bio = normalizeOptional(input.bio);
    }
    if (input.region !== undefined) {
      updateData.region = normalizeOptional(input.region);
    }
    if (input.wechatId !== undefined) {
      updateData.wechatId = normalizeOptional(input.wechatId);
    }
    if (input.defaultMomentVisibility !== undefined) {
      if (!["public", "private", "partial"].includes(input.defaultMomentVisibility)) {
        throw new BadRequestException("无效的可见范围");
      }
      updateData.defaultMomentVisibility = input.defaultMomentVisibility;
    }

    await this.prisma.wechatProfile.update({
      where: { userId },
      data: updateData,
    });

    return this.getProfile(userId);
  }

  private toView(profile: ProfileRow, user: UserRow): WechatProfileView {
    const fallbackName = user.nickname?.trim() || user.username;
    const effectiveDisplayName = profile.displayName?.trim() || fallbackName;
    const effectiveAvatarUrl = profile.avatarUrl ?? user.avatar ?? null;
    const effectiveBio = profile.bio ?? user.bio ?? null;
    const effectiveRegion = profile.region ?? user.region ?? null;

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
      effectiveDisplayName,
      effectiveAvatarUrl,
      effectiveBio,
      effectiveRegion,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
