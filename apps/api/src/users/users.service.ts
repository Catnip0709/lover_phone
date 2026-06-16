import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "@myphone/shared";
import { PrismaService } from "../infra/prisma.service.js";

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
}
