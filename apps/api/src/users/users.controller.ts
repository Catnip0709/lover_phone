import { Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { AgeConfirmResponse } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { UsersService } from "./users.service.js";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Post("age-confirm")
  async confirmAdult(@Req() request: AuthenticatedRequest): Promise<AgeConfirmResponse> {
    return {
      user: await this.users.confirmAdult(this.userId(request)),
    };
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }

    return request.user.id;
  }
}
