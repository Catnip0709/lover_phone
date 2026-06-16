import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

@Injectable()
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

    return `scrypt:${salt}:${key.toString("hex")}`;
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, salt, storedKey] = passwordHash.split(":");

    if (algorithm !== "scrypt" || !salt || !storedKey) {
      return false;
    }

    const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    const stored = Buffer.from(storedKey, "hex");

    if (key.length !== stored.length) {
      return false;
    }

    return timingSafeEqual(key, stored);
  }
}
