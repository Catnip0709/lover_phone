import { Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type EncryptedApiKey = {
  encryptedApiKey: string;
  apiKeyIv: string;
  apiKeyAuthTag: string;
  apiKeyMasked: string;
};

@Injectable()
export class ApiKeyCryptoService {
  encrypt(apiKey: string): EncryptedApiKey {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedApiKey: encrypted.toString("base64"),
      apiKeyIv: iv.toString("base64"),
      apiKeyAuthTag: authTag.toString("base64"),
      apiKeyMasked: this.mask(apiKey),
    };
  }

  decrypt(input: {
    encryptedApiKey: string;
    apiKeyIv: string;
    apiKeyAuthTag: string;
  }): string {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key(),
      Buffer.from(input.apiKeyIv, "base64"),
    );

    decipher.setAuthTag(Buffer.from(input.apiKeyAuthTag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(input.encryptedApiKey, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  mask(apiKey: string): string {
    if (apiKey.length <= 8) {
      return "****";
    }

    return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`;
  }

  private key(): Buffer {
    const secret = process.env.API_KEY_ENCRYPTION_SECRET;

    if (!secret) {
      throw new Error("API_KEY_ENCRYPTION_SECRET is required");
    }

    return createHash("sha256").update(secret).digest();
  }
}
