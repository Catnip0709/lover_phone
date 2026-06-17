import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseBody } from "../common/zod.js";
import { UploadsService } from "./uploads.service.js";

const uploadAvatarSchema = z
  .object({
    dataUrl: z.string().min(1).max(4 * 1024 * 1024),
  })
  .strict();

@Controller("uploads")
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(@Inject(UploadsService) private readonly uploads: UploadsService) {}

  @Post("avatar")
  async uploadAvatar(@Body() body: unknown): Promise<{ url: string }> {
    const input = parseBody(uploadAvatarSchema, body);
    return this.uploads.saveAvatarFromDataUrl(input.dataUrl);
  }
}
