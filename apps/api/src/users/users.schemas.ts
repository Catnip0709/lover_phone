import { z } from "zod";

const trimmedString = (max: number) => z.string().max(max);

export const patchMeProfileSchema = z
  .object({
    nickname: trimmedString(40).nullable().optional(),
    avatar: trimmedString(2048).nullable().optional(),
    birthday: trimmedString(40).nullable().optional(),
    gender: z.enum(["male", "female", "other"]).nullable().optional(),
    bio: trimmedString(200).nullable().optional(),
    region: trimmedString(80).nullable().optional(),
  })
  .strict();

export type PatchMeProfileInput = z.infer<typeof patchMeProfileSchema>;
