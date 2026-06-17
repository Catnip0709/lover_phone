import { z } from "zod";

export const patchProfileSchema = z.object({
  displayName: z.string().max(40).nullable().optional(),
  avatarUrl: z.string().max(2048).nullable().optional(),
  bio: z.string().max(200).nullable().optional(),
  region: z.string().max(80).nullable().optional(),
  wechatId: z.string().max(40).nullable().optional(),
  defaultMomentVisibility: z.enum(["public", "private", "partial"]).optional(),
}).strict();

export type PatchProfileInput = z.infer<typeof patchProfileSchema>;

const walletAmountSchema = z.number().positive().max(9999).finite();

export const rechargeWalletSchema = z.object({
  amount: z.union([z.literal(6), z.literal(66), z.literal(666)]),
}).strict();

export const sendRedPacketSchema = z.object({
  conversationId: z.string().uuid(),
  characterId: z.string().uuid(),
  amount: walletAmountSchema,
  greetings: z.string().min(1).max(140),
}).strict();

export const sendTransferSchema = z.object({
  conversationId: z.string().uuid(),
  characterId: z.string().uuid(),
  amount: walletAmountSchema,
  remark: z.string().min(1).max(140),
}).strict();

export type SendRedPacketInput = z.infer<typeof sendRedPacketSchema>;
export type SendTransferInput = z.infer<typeof sendTransferSchema>;
export type RechargeWalletInput = z.infer<typeof rechargeWalletSchema>;
