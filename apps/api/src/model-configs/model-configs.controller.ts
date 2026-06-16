import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { ModelConfigView, TestModelConfigResponse } from "@myphone/shared";
import { parseBody } from "../common/zod.js";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ModelConfigsService } from "./model-configs.service.js";
import { testModelConfigSchema, upsertModelConfigSchema } from "./model-configs.schemas.js";

@Controller("model-configs")
@UseGuards(JwtAuthGuard)
export class ModelConfigsController {
  constructor(
    @Inject(ModelConfigsService)
    private readonly modelConfigs: ModelConfigsService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<ModelConfigView[]> {
    return this.modelConfigs.list(this.userId(request));
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<ModelConfigView> {
    const parsed = parseBody(upsertModelConfigSchema, body);
    const input = { ...parsed, isDefault: parsed.isDefault ?? true };
    return this.modelConfigs.create(this.userId(request), input);
  }

  @Patch(":id")
  update(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ): Promise<ModelConfigView> {
    const parsed = parseBody(upsertModelConfigSchema, body);
    const input = { ...parsed, isDefault: parsed.isDefault ?? true };
    return this.modelConfigs.update(this.userId(request), id, input);
  }

  @Delete(":id")
  remove(@Req() request: AuthenticatedRequest, @Param("id") id: string): Promise<{ success: true }> {
    return this.modelConfigs.remove(this.userId(request), id);
  }

  @Post("test")
  test(@Body() body: unknown): Promise<TestModelConfigResponse> {
    const input = parseBody(testModelConfigSchema, body);
    return this.modelConfigs.test(input);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }

    return request.user.id;
  }
}
