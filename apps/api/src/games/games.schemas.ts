import { z } from "zod";

const MEMORY_MODES = ["readOnly", "ephemeral", "off"] as const;

export const gameCompanionActionSchema = z.object({
  gameId: z.string().trim().min(1, "游戏 ID 不能为空").max(80, "游戏 ID 不能超过 80 个字符"),
  gameTitle: z.string().trim().min(1, "游戏名称不能为空").max(80, "游戏名称不能超过 80 个字符"),
  characterId: z.string().trim().min(1, "请选择陪玩的角色"),
  memoryMode: z.enum(MEMORY_MODES).default("readOnly"),
  userIntent: z.string().trim().max(500, "用户意图不能超过 500 个字符").optional(),
  gameState: z
    .object({
      phase: z.string().trim().max(80, "游戏阶段不能超过 80 个字符").optional(),
      event: z.string().trim().max(160, "游戏事件不能超过 160 个字符").optional(),
      score: z.number().finite().optional(),
      summary: z.string().trim().max(600, "游戏摘要不能超过 600 个字符").optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export type GameCompanionActionDto = z.infer<typeof gameCompanionActionSchema>;
