import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { ConversationProfileView, ConversationView, MessageView, SendMessageResponse } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { ConversationsService } from "./conversations.service.js";
import { sendMessageSchema } from "./conversations.schemas.js";

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    @Inject(ConversationsService)
    private readonly conversations: ConversationsService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<ConversationView[]> {
    return this.conversations.list(this.userId(request));
  }

  @Get(":id/messages")
  messages(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<MessageView[]> {
    return this.conversations.messages(this.userId(request), id);
  }

  @Get(":id/profile")
  profile(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<ConversationProfileView> {
    return this.conversations.profile(this.userId(request), id);
  }

  @Post(":id/messages")
  sendMessage(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<SendMessageResponse> {
    const input = parseBody(sendMessageSchema, body);
    return this.conversations.sendMessage(this.userId(request), id, input);
  }

  @Post(":id/read")
  markRead(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<{ success: true }> {
    return this.conversations.markRead(this.userId(request), id);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }

    return request.user.id;
  }
}
