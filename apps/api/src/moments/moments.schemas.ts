import { z } from "zod";

export const createMomentSchema = z.object({
  content: z.string().min(1).max(1000),
  imageUrls: z.array(z.string().url()).max(9).optional(),
  location: z.string().max(80).nullable().optional(),
  visibility: z.enum(["public", "private", "friends"]).optional(),
}).strict();

export const createMomentCommentSchema = z.object({
  content: z.string().min(1).max(500),
}).strict();

export type CreateMomentInput = z.infer<typeof createMomentSchema>;
export type CreateMomentCommentInput = z.infer<typeof createMomentCommentSchema>;
