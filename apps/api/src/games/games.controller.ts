import { Body, Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { GameCompanionResponse } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { gameCompanionActionSchema } from "./games.schemas.js";
import { GamesService } from "./games.service.js";

@Controller("games")
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(
    @Inject(GamesService)
    private readonly games: GamesService,
  ) {}

  @Post("companion-action")
  companionAction(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<GameCompanionResponse> {
    const input = parseBody(gameCompanionActionSchema, body);
    return this.games.createCompanionAction(this.userId(request), input);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }

    return request.user.id;
  }
}
