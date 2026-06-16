import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthResponse, AuthUser } from "@myphone/shared";
import { parseBody } from "../common/zod.js";
import { AuthService } from "./auth.service.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schemas.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: unknown): Promise<AuthResponse> {
    const input = parseBody(registerSchema, body);
    return this.authService.register(input);
  }

  @Post("login")
  async login(@Body() body: unknown): Promise<AuthResponse> {
    const input = parseBody(loginSchema, body);
    return this.authService.login(input);
  }

  @Post("refresh")
  async refresh(@Body() body: unknown): Promise<AuthResponse> {
    const input = parseBody(refreshSchema, body);
    return this.authService.refresh(input.refreshToken);
  }

  @Post("logout")
  async logout(@Body() body: unknown): Promise<{ success: true }> {
    const input = parseBody(refreshSchema, body);
    return this.authService.logout(input.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest): AuthUser {
    if (!request.user) {
      throw new BadRequestException("用户上下文不存在");
    }

    return request.user;
  }

}
