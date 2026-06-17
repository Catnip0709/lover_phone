import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 2 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly avatarDir = join(process.cwd(), "uploads", "avatars");

  async saveAvatarFromDataUrl(dataUrl: string): Promise<{ url: string }> {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
    if (!match) {
      throw new BadRequestException("无效的图片数据");
    }

    const mime = match[1].toLowerCase();
    const ext = ALLOWED_MIME[mime];
    if (!ext) {
      throw new BadRequestException("仅支持 png/jpg/webp/gif 图片");
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(match[2], "base64");
    } catch {
      throw new BadRequestException("无效的图片数据");
    }

    if (buffer.byteLength === 0) {
      throw new BadRequestException("图片为空");
    }
    if (buffer.byteLength > MAX_BYTES) {
      throw new BadRequestException("图片不能超过 2MB");
    }

    await mkdir(this.avatarDir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(join(this.avatarDir, filename), buffer);

    return { url: `/uploads/avatars/${filename}` };
  }
}
