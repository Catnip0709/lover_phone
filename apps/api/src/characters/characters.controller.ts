import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { CharacterCardImportResponse, CharacterView, CreateCharacterResponse } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { CharactersService } from "./characters.service.js";
import { createCharacterSchema, importCharacterCardSchema, updateCharacterSchema, updateCharacterStatusSchema } from "./characters.schemas.js";

@Controller("characters")
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(@Inject(CharactersService) private readonly characters: CharactersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<CharacterView[]> {
    return this.characters.list(this.userId(request));
  }

  @Post("import/parse")
  parseImport(
    @Body() body: unknown,
  ): CharacterCardImportResponse {
    const input = parseBody(importCharacterCardSchema, body);
    return this.characters.parseImport(input);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<CreateCharacterResponse> {
    const input = parseBody(createCharacterSchema, body);
    return this.characters.create(this.userId(request), input);
  }

  @Patch(":id")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") characterId: string,
    @Body() body: unknown,
  ): Promise<CharacterView> {
    const input = parseBody(updateCharacterSchema, body);
    return this.characters.update(this.userId(request), characterId, input);
  }

  @Patch(":id/status")
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param("id") characterId: string,
    @Body() body: unknown,
  ): Promise<CharacterView> {
    const input = parseBody(updateCharacterStatusSchema, body);
    return this.characters.updateStatus(this.userId(request), characterId, input.isActive);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }

    return request.user.id;
  }
}
