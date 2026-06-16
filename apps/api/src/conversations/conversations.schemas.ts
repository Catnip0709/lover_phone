import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "消息不能为空").max(2000, "消息不能超过 2000 个字符"),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
