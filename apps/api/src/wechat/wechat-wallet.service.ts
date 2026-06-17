import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../infra/prisma.service.js";

export type WalletTransactionView = {
  id: string;
  type: "red_packet" | "transfer" | "recharge";
  amountCents: number;
  direction: "sent" | "received";
  remark: string | null;
  status: string;
  createdAt: string;
};

@Injectable()
export class WechatWalletService {
  private readonly maxBalanceCents = 10_000_000;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async getWalletInfo(userId: string): Promise<{ balanceCents: number; transactions: WalletTransactionView[] }> {
    const profile = await this.ensureWechatProfile(userId);

    const transactions = await this.prisma.wechatWalletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }).catch(() => []);

    return {
      balanceCents: profile.walletBalanceCents,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type as "red_packet" | "transfer" | "recharge",
        amountCents: t.amountCents,
        direction: t.direction as "sent" | "received",
        remark: t.remark,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async rechargeWallet(userId: string, amount: 6 | 66 | 666): Promise<{ balanceCents: number; addedCents: number }> {
    const amountCents = this.amountToCents(amount);
    const profile = await this.ensureWechatProfile(userId);

    if (profile.walletBalanceCents + amountCents > this.maxBalanceCents) {
      throw new BadRequestException("钱包余额上限为 ¥100000.00");
    }

    const nextProfile = await this.prisma.wechatProfile.update({
      where: { userId },
      data: { walletBalanceCents: { increment: amountCents } },
    });

    await this.prisma.wechatWalletTransaction.create({
      data: {
        userId,
        type: "recharge",
        amountCents,
        direction: "received",
        remark: `虚拟充值 ¥${amount.toFixed(2)}`,
        status: "completed",
      },
    }).catch(() => undefined);

    return {
      balanceCents: nextProfile.walletBalanceCents,
      addedCents: amountCents,
    };
  }

  async claimRedPacket(
    userId: string,
    messageId: string,
  ): Promise<{ success: boolean; amountCents?: number; message: string }> {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, userId, type: "red_packet", deletedAt: null },
      include: { walletTransaction: true },
    });

    if (!message) {
      throw new NotFoundException("红包不存在");
    }

    if (message.sender === "user") {
      return { success: false, message: "不能领取自己发送的红包" };
    }

    if (!message.walletTransaction) {
      throw new BadRequestException("红包流水不存在");
    }

    if (message.walletTransaction.status === "completed") {
      return { success: false, message: "红包已被领取" };
    }

    const payload = message.payload as { amount?: number };
    const amountCents = this.amountToCents(payload?.amount ?? 5.2);

    const profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("钱包不存在");
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.wechatWalletTransaction.updateMany({
        where: { id: message.walletTransaction!.id, status: "pending" },
        data: { status: "completed" },
      });

      if (updated.count !== 1) {
        throw new BadRequestException("红包已被领取");
      }

      await tx.wechatProfile.update({
        where: { userId },
        data: { walletBalanceCents: { increment: amountCents } },
      });

      await tx.wechatWalletTransaction.create({
        data: {
          userId,
          type: "red_packet",
          amountCents,
          direction: "received",
          characterId: message.characterId,
          status: "completed",
        },
      });

      await tx.message.update({
        where: { id: message.id },
        data: {
          payload: {
            ...this.toJsonObject(message.payload),
            claimed: true,
            status: "completed",
          } satisfies Prisma.InputJsonObject,
        },
      });
    });

    return {
      success: true,
      amountCents,
      message: `领取成功，获得 ¥${(amountCents / 100).toFixed(2)}`,
    };
  }

  async claimTransfer(
    userId: string,
    messageId: string,
  ): Promise<{ success: boolean; amountCents?: number; message: string }> {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, userId, type: "transfer", deletedAt: null },
      include: { walletTransaction: true },
    });

    if (!message) {
      throw new NotFoundException("转账不存在");
    }

    if (message.sender === "user") {
      return { success: false, message: "不能接收自己发起的转账" };
    }

    if (!message.walletTransaction) {
      throw new BadRequestException("转账流水不存在");
    }

    if (message.walletTransaction.status === "completed") {
      return { success: false, message: "转账已被接收" };
    }

    const payload = message.payload as { amount?: number };
    const amountCents = this.amountToCents(payload?.amount ?? 13.14);

    const profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("钱包不存在");
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.wechatWalletTransaction.updateMany({
        where: { id: message.walletTransaction!.id, status: "pending" },
        data: { status: "completed" },
      });

      if (updated.count !== 1) {
        throw new BadRequestException("转账已被接收");
      }

      await tx.wechatProfile.update({
        where: { userId },
        data: { walletBalanceCents: { increment: amountCents } },
      });

      await tx.wechatWalletTransaction.create({
        data: {
          userId,
          type: "transfer",
          amountCents,
          direction: "received",
          characterId: message.characterId,
          status: "completed",
        },
      });

      await tx.message.update({
        where: { id: message.id },
        data: {
          payload: {
            ...this.toJsonObject(message.payload),
            claimed: true,
            status: "completed",
          } satisfies Prisma.InputJsonObject,
        },
      });
    });

    return {
      success: true,
      amountCents,
      message: `接收成功，¥${(amountCents / 100).toFixed(2)} 已到账`,
    };
  }

  async sendRedPacket(
    userId: string,
    conversationId: string,
    characterId: string,
    amount: number,
    greetings: string,
  ): Promise<{ messageId: string }> {
    const amountCents = this.amountToCents(amount);

    const profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("钱包不存在");
    }

    if (profile.walletBalanceCents < amountCents) {
      throw new BadRequestException("余额不足");
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId, characterId },
      include: { character: true },
    });

    if (!conversation) {
      throw new NotFoundException("会话不存在");
    }

    const decision = this.decideCharacterRedPacketResponse({
      amount,
      greetings,
      characterName: conversation.character.nickname,
    });

    const { message } = await this.prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.wechatProfile.update({
        where: { userId },
        data: { walletBalanceCents: { decrement: amountCents } },
      });

      if (updatedProfile.walletBalanceCents < 0) {
        throw new BadRequestException("余额不足");
      }

      const message = await tx.message.create({
        data: {
          userId,
          conversationId,
          characterId,
          sender: "user",
          type: "red_packet",
          content: greetings,
          payload: {
            amount,
            greetings,
            claimed: decision.accepted,
            status: decision.accepted ? "accepted" : "refused",
            decisionText: decision.reply,
          },
        },
      });

      const walletTransaction = await tx.wechatWalletTransaction.create({
        data: {
          userId,
          type: "red_packet",
          amountCents,
          direction: "sent",
          messageId: message.id,
          characterId,
          remark: greetings,
          status: decision.accepted ? "completed" : "refused",
        },
      });

      if (!decision.accepted) {
        await tx.wechatProfile.update({
          where: { userId },
          data: { walletBalanceCents: { increment: amountCents } },
        });
      }

      const characterMessage = await tx.message.create({
        data: {
          userId,
          conversationId,
          characterId,
          sender: "character",
          type: "text",
          content: decision.reply,
          payload: {
            source: "red_packet_decision",
            redPacketMessageId: message.id,
            redPacketStatus: decision.accepted ? "accepted" : "refused",
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessagePreview: decision.reply,
          lastMessageAt: characterMessage.createdAt,
          unreadCount: { increment: 1 },
        },
      });

      return { walletTransaction, message };
    });

    return { messageId: message.id };
  }

  async sendTransfer(
    userId: string,
    conversationId: string,
    characterId: string,
    amount: number,
    remark: string,
  ): Promise<{ messageId: string }> {
    const amountCents = this.amountToCents(amount);

    const profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("钱包不存在");
    }

    if (profile.walletBalanceCents < amountCents) {
      throw new BadRequestException("余额不足");
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId, characterId },
    });

    if (!conversation) {
      throw new NotFoundException("会话不存在");
    }

    const { message } = await this.prisma.$transaction(async (tx) => {
      const updatedProfile = await tx.wechatProfile.update({
        where: { userId },
        data: { walletBalanceCents: { decrement: amountCents } },
      });

      if (updatedProfile.walletBalanceCents < 0) {
        throw new BadRequestException("余额不足");
      }

      const message = await tx.message.create({
        data: {
          userId,
          conversationId,
          characterId,
          sender: "user",
          type: "transfer",
          content: remark,
          payload: { amount, remark, claimed: false },
        },
      });

      const walletTransaction = await tx.wechatWalletTransaction.create({
        data: {
          userId,
          type: "transfer",
          amountCents,
          direction: "sent",
          messageId: message.id,
          characterId,
          remark,
          status: "pending",
        },
      });

      return { walletTransaction, message };
    });

    return { messageId: message.id };
  }

  private amountToCents(amount: number): number {
    const amountCents = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new BadRequestException("金额必须大于 0");
    }
    return amountCents;
  }

  private async ensureWechatProfile(userId: string) {
    const profile = await this.prisma.wechatProfile.findUnique({
      where: { userId },
    });

    if (profile) {
      return profile;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, username: true },
    });

    if (!user) {
      throw new NotFoundException("用户不存在");
    }

    return this.prisma.wechatProfile.create({
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

  private decideCharacterRedPacketResponse(input: {
    amount: number;
    greetings: string;
    characterName: string;
  }): { accepted: boolean; reply: string } {
    const greetings = input.greetings.trim();
    const forcefulWords = ["必须收", "不收不行", "拿着", "命令", "别废话"];
    const soundsForceful = forcefulWords.some((word) => greetings.includes(word));

    if (soundsForceful) {
      return {
        accepted: false,
        reply: "心意我收到了，但钱我不想这样收。我先退回去，你别介意。",
      };
    }

    if (input.amount >= 666) {
      return {
        accepted: false,
        reply: "这个红包太贵重了，我先替你退回去。你把这份心意留给我就够了。",
      };
    }

    return {
      accepted: true,
      reply: `我收下啦：${greetings}。这份心意，我会认真记住。`,
    };
  }

  private toJsonObject(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
