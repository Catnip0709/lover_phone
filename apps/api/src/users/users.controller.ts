import { Body, Controller, Get, Inject, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { AgeConfirmResponse, MeProfileView } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { patchMeProfileSchema } from "./users.schemas.js";
import { UsersService } from "./users.service.js";

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post("users/age-confirm")
  async confirmAdult(@Req() request: AuthenticatedRequest): Promise<AgeConfirmResponse> {
    return {
      user: await this.users.confirmAdult(this.userId(request)),
    };
  }

  @Get("me/profile")
  async getMeProfile(@Req() request: AuthenticatedRequest): Promise<MeProfileView> {
    return this.users.getMeProfile(this.userId(request));
  }

  @Patch("me/profile")
  async updateMeProfile(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<MeProfileView> {
    const input = parseBody(patchMeProfileSchema, body);
    return this.users.updateMeProfile(this.userId(request), input);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }

    return request.user.id;
  }
}
