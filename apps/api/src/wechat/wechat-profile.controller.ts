import { Body, Controller, Get, Inject, Patch, Req, UseGuards } from "@nestjs/common";
import type { WechatProfileView } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { WechatProfileService } from "./wechat-profile.service.js";
import { patchProfileSchema } from "./wechat.schemas.js";

@Controller("wechat")
@UseGuards(JwtAuthGuard)
export class WechatProfileController {
  constructor(
    @Inject(WechatProfileService)
    private readonly profile: WechatProfileService,
  ) {}

  @Get("profile")
  async getProfile(@Req() request: AuthenticatedRequest): Promise<WechatProfileView> {
    return this.profile.getProfile(this.userId(request));
  }

  @Patch("profile")
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<WechatProfileView> {
    const input = parseBody(patchProfileSchema, body);
    return this.profile.updateProfile(this.userId(request), input);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }
    return request.user.id;
  }
}
