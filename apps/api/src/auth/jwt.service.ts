import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export type JwtTokenType = "access" | "refresh";

export type JwtPayload = {
  sub: string;
  username: string;
  type: JwtTokenType;
  jti?: string;
  exp: number;
  iat: number;
};

const ACCESS_TTL_SECONDS = 2 * 60 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class JwtService {
  get refreshTtlSeconds(): number {
    return REFRESH_TTL_SECONDS;
  }

  signAccessToken(user: { id: string; username: string }): string {
    return this.sign(
      {
      sub: user.id,
      username: user.username,
      type: "access",
      iat: this.now(),
      exp: this.now() + ACCESS_TTL_SECONDS,
      },
      "access",
    );
  }

  signRefreshToken(user: { id: string; username: string }): { token: string; jti: string } {
    const jti = randomUUID();
    const token = this.sign(
      {
      sub: user.id,
      username: user.username,
      type: "refresh",
      jti,
      iat: this.now(),
      exp: this.now() + REFRESH_TTL_SECONDS,
      },
      "refresh",
    );

    return { token, jti };
  }

  verify(token: string, expectedType: JwtTokenType): JwtPayload {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException("Token 格式不正确");
    }

    const expectedSignature = this.signingInput(encodedHeader, encodedPayload, expectedType);

    if (!this.safeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException("Token 签名不正确");
    }

    const payload = JSON.parse(this.base64UrlDecode(encodedPayload).toString("utf8")) as JwtPayload;

    if (payload.type !== expectedType) {
      throw new UnauthorizedException("Token 类型不正确");
    }

    if (payload.exp <= this.now()) {
      throw new UnauthorizedException("Token 已过期");
    }

    return payload;
  }

  private sign(payload: JwtPayload, tokenType: JwtTokenType): string {
    const header = this.base64UrlEncode(
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })),
    );
    const body = this.base64UrlEncode(Buffer.from(JSON.stringify(payload)));
    const signature = this.signingInput(header, body, tokenType);

    return `${header}.${body}.${signature}`;
  }

  private signingInput(
    encodedHeader: string,
    encodedPayload: string,
    tokenType: JwtTokenType,
  ): string {
    return this.base64UrlEncode(
      createHmac("sha256", this.secret(tokenType))
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest(),
    );
  }

  private secret(tokenType: JwtTokenType): string {
    const secret =
      tokenType === "access" ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new Error(
        tokenType === "access" ? "JWT_ACCESS_SECRET is required" : "JWT_REFRESH_SECRET is required",
      );
    }

    return secret;
  }

  private now(): number {
    return Math.floor(Date.now() / 1000);
  }

  private base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  private base64UrlDecode(value: string): Buffer {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64");
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
