import { z } from "zod";

export const createCharacterSchema = z.object({
  name: z.string().trim().min(1, "角色名称不能为空").max(80, "角色名称过长"),
  nickname: z.string().trim().min(1, "昵称不能为空").max(80, "昵称过长").optional(),
  age: z.number().int().min(18, "角色必须年满 18 岁").max(80, "年龄不能超过 80 岁").optional(),
  birthday: z.string().trim().max(40).optional(),
  occupation: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  avatarPreset: z.string().trim().min(1).max(80).optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(3_000_000, "头像图片不能超过 2MB")
    .refine((value) => !value || /^data:image\/(png|jpeg|jpg|webp);base64,/.test(value), "头像格式仅支持 PNG/JPG/WEBP")
    .optional(),
  storyBackground: z.string().trim().max(3000, "故事背景过长").optional(),
  userAddressing: z.string().trim().max(40, "称呼过长").optional(),
  temperature: z.number().min(0.5, "温度不能小于 0.5").max(1.2, "温度不能大于 1.2").optional(),
  relationshipStage: z.enum(["stranger", "ambiguous", "dating", "lover"]).optional(),
  adultEnabled: z.boolean().optional(),
  adultIntensity: z.enum(["light", "medium", "high"]).optional(),
  proactiveFrequency: z.enum(["low", "medium", "high"]).optional(),
  rawCharacterCard: z.string().trim().max(5000, "角色卡过长"),
  safetyAccepted: z.boolean().optional(),
});

export type CreateCharacterDto = z.infer<typeof createCharacterSchema>;

export const updateCharacterSchema = createCharacterSchema;

export type UpdateCharacterDto = z.infer<typeof updateCharacterSchema>;

export const importCharacterCardSchema = z.object({
  content: z.string().trim().min(10, "请粘贴至少 10 个字符的角色卡").max(12000, "角色卡导入内容过长"),
});

export type ImportCharacterCardDto = z.infer<typeof importCharacterCardSchema>;
