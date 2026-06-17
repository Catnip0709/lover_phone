import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser, MeProfileView } from "@myphone/shared";
import { PrismaService } from "../infra/prisma.service.js";
import type { PatchMeProfileInput } from "./users.schemas.js";

type UserRecord = {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  birthday: string | null;
  gender: string | null;
  bio: string | null;
  region: string | null;
  ageConfirmed: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createUser(input: { username: string; passwordHash: string }): Promise<AuthUser> {
    const existing = await this.prisma.user.findFirst({
      where: {
        username: input.username,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException("用户名已存在");
    }

    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash: input.passwordHash,
      },
    });

    return this.toAuthUser(user);
  }

  async findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: {
        username,
        deletedAt: null,
      },
    });
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    return user ? this.toAuthUser(user) : null;
  }

  async confirmAdult(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ageConfirmed: true },
    });

    return this.toAuthUser(user);
  }

  async getMeProfile(userId: string): Promise<MeProfileView> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return this.toMeProfileView(user as UserRecord);
  }

  async updateMeProfile(userId: string, input: PatchMeProfileInput): Promise<MeProfileView> {
    const data: Record<string, string | null> = {};

    if (input.nickname !== undefined) {
      data.nickname = normalizeOptional(input.nickname);
    }
    if (input.avatar !== undefined) {
      data.avatar = normalizeOptional(input.avatar);
    }
    if (input.birthday !== undefined) {
      data.birthday = normalizeOptional(input.birthday);
    }
    if (input.gender !== undefined) {
      data.gender = input.gender;
    }
    if (input.bio !== undefined) {
      data.bio = normalizeOptional(input.bio);
    }
    if (input.region !== undefined) {
      data.region = normalizeOptional(input.region);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.toMeProfileView(user as UserRecord);
  }

  toAuthUser(user: {
    id: string;
    username: string;
    nickname: string | null;
    ageConfirmed: boolean;
    createdAt: Date;
  }): AuthUser {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      ageConfirmed: user.ageConfirmed,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private toMeProfileView(user: UserRecord): MeProfileView {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      birthday: user.birthday,
      gender: (user.gender as MeProfileView["gender"]) ?? null,
      bio: user.bio,
      region: user.region,
      ageConfirmed: user.ageConfirmed,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
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
