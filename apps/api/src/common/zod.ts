import { BadRequestException } from "@nestjs/common";
import { ZodError, type ZodSchema } from "zod";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new BadRequestException(error.issues.map((issue) => issue.message).join("; "));
    }

    throw error;
  }
}
