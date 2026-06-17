import { z } from "zod";

const MESSAGE_TYPES = [
  "text",
  "voice",
  "image",
  "sticker",
  "quote",
  "red_packet",
  "transfer",
  "location",
  "official_account_article",
  "moment_share",
  "video",
  "system_hint",
] as const;

export const sendMessageSchema = z
  .object({
    content: z.string().trim().max(2000, "消息不能超过 2000 个字符").optional(),
    type: z.enum(MESSAGE_TYPES).default("text"),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((input, context) => {
    if (input.type === "red_packet" || input.type === "transfer") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "红包和转账必须通过钱包专用接口发送",
        path: ["type"],
      });
    }
  });

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
