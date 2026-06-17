import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { WechatWalletService } from "./wechat-wallet.service.js";
import { rechargeWalletSchema, sendRedPacketSchema, sendTransferSchema } from "./wechat.schemas.js";

@Controller("wechat/wallet")
@UseGuards(JwtAuthGuard)
export class WechatWalletController {
  constructor(
    @Inject(WechatWalletService)
    private readonly walletService: WechatWalletService,
  ) {}

  @Get()
  async getWallet(@Req() request: AuthenticatedRequest) {
    const userId = this.userId(request);
    return this.walletService.getWalletInfo(userId);
  }

  @Post("recharge")
  async rechargeWallet(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const userId = this.userId(request);
    const input = parseBody(rechargeWalletSchema, body);
    return this.walletService.rechargeWallet(userId, input.amount);
  }

  @Post("red-packet/:messageId/claim")
  async claimRedPacket(
    @Req() request: AuthenticatedRequest,
    @Param("messageId") messageId: string,
  ) {
    const userId = this.userId(request);
    return this.walletService.claimRedPacket(userId, messageId);
  }

  @Post("transfer/:messageId/claim")
  async claimTransfer(
    @Req() request: AuthenticatedRequest,
    @Param("messageId") messageId: string,
  ) {
    const userId = this.userId(request);
    return this.walletService.claimTransfer(userId, messageId);
  }

  @Post("send/red-packet")
  async sendRedPacket(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const userId = this.userId(request);
    const input = parseBody(sendRedPacketSchema, body);
    return this.walletService.sendRedPacket(
      userId,
      input.conversationId,
      input.characterId,
      input.amount,
      input.greetings,
    );
  }

  @Post("send/transfer")
  async sendTransfer(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    const userId = this.userId(request);
    const input = parseBody(sendTransferSchema, body);
    return this.walletService.sendTransfer(
      userId,
      input.conversationId,
      input.characterId,
      input.amount,
      input.remark,
    );
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }
    return request.user.id;
  }
}
