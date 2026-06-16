import { z } from "zod";

export const modelProviderSchema = z.enum(["deepseek", "glm", "kimi"]);

export const upsertModelConfigSchema = z.object({
  provider: modelProviderSchema,
  modelName: z.string().trim().min(1, "模型名称不能为空").max(80, "模型名称过长"),
  apiKey: z.string().trim().min(1, "API Key 不能为空"),
  isDefault: z.boolean().default(true),
});

export const testModelConfigSchema = z.object({
  provider: modelProviderSchema,
  modelName: z.string().trim().min(1, "模型名称不能为空").max(80, "模型名称过长"),
  apiKey: z.string().trim().min(1, "API Key 不能为空"),
});

export type UpsertModelConfigDto = z.infer<typeof upsertModelConfigSchema>;
export type TestModelConfigDto = z.infer<typeof testModelConfigSchema>;
