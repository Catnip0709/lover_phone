import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ModelConfigView,
  TestModelConfigResponse,
  UpsertModelConfigRequest,
} from "@myphone/shared";
import { ModelProviderService } from "../ai/model-provider.service.js";
import { PrismaService } from "../infra/prisma.service.js";
import { ApiKeyCryptoService } from "./api-key-crypto.service.js";

@Injectable()
export class ModelConfigsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(ApiKeyCryptoService)
    private readonly crypto: ApiKeyCryptoService,
    @Inject(ModelProviderService)
    private readonly providers: ModelProviderService,
  ) {}

  async list(userId: string): Promise<ModelConfigView[]> {
    const configs = await this.prisma.modelConfig.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return configs.map((config) => this.toView(config));
  }

  async create(userId: string, input: UpsertModelConfigRequest): Promise<ModelConfigView> {
    const encrypted = this.crypto.encrypt(input.apiKey);

    if (input.isDefault) {
      await this.unsetDefault(userId);
    }

    const config = await this.prisma.modelConfig.create({
      data: {
        userId,
        provider: input.provider,
        modelName: input.modelName,
        ...encrypted,
        isDefault: input.isDefault,
        lastTestStatus: "untested",
      },
    });

    return this.toView(config);
  }

  async update(
    userId: string,
    id: string,
    input: UpsertModelConfigRequest,
  ): Promise<ModelConfigView> {
    await this.assertOwned(userId, id);

    const encrypted = this.crypto.encrypt(input.apiKey);

    if (input.isDefault) {
      await this.unsetDefault(userId);
    }

    const config = await this.prisma.modelConfig.update({
      where: { id },
      data: {
        provider: input.provider,
        modelName: input.modelName,
        ...encrypted,
        isDefault: input.isDefault,
        lastTestStatus: "untested",
        lastTestError: null,
      },
    });

    return this.toView(config);
  }

  async remove(userId: string, id: string): Promise<{ success: true }> {
    await this.assertOwned(userId, id);
    await this.prisma.modelConfig.delete({ where: { id } });
    return { success: true };
  }

  async testAndUpdate(
    userId: string,
    input: UpsertModelConfigRequest,
    id?: string,
  ): Promise<TestModelConfigResponse> {
    const result = await this.providers.testConnection(input);

    if (id) {
      await this.assertOwned(userId, id);
      await this.prisma.modelConfig.update({
        where: { id },
        data: {
          lastTestStatus: result.success ? "success" : "failed",
          lastTestError: result.success ? null : result.message,
        },
      });
    }

    return result;
  }

  async test(input: {
    provider: UpsertModelConfigRequest["provider"];
    modelName: string;
    apiKey: string;
  }): Promise<TestModelConfigResponse> {
    return this.providers.testConnection(input);
  }

  private async unsetDefault(userId: string): Promise<void> {
    await this.prisma.modelConfig.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private async assertOwned(userId: string, id: string): Promise<void> {
    const config = await this.prisma.modelConfig.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!config) {
      throw new NotFoundException("模型配置不存在");
    }

    if (config.userId !== userId) {
      throw new ForbiddenException("无权操作该模型配置");
    }
  }

  private toView(config: {
    id: string;
    provider: ModelConfigView["provider"];
    modelName: string;
    apiKeyMasked: string;
    isDefault: boolean;
    lastTestStatus: string;
    lastTestError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ModelConfigView {
    return {
      id: config.id,
      provider: config.provider,
      modelName: config.modelName,
      apiKeyMasked: config.apiKeyMasked,
      isDefault: config.isDefault,
      lastTestStatus: this.normalizeTestStatus(config.lastTestStatus),
      lastTestError: config.lastTestError,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  private normalizeTestStatus(status: string): ModelConfigView["lastTestStatus"] {
    if (status === "success" || status === "failed" || status === "untested") {
      return status;
    }

    return "untested";
  }
}
