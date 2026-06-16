import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(2, "用户名至少 2 个字符")
  .max(20, "用户名最多 20 个字符")
  .regex(/^[\p{L}\p{N}_]+$/u, "用户名仅支持中文、英文、数字、下划线");

const passwordSchema = z.string().min(6, "密码不少于 6 位");

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = registerSchema;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken 不能为空"),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
