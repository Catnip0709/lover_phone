import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureConnected();
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    await this.client.set(key, value, "EX", ttlSeconds);
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(key);
  }

  private async ensureConnected(): Promise<void> {
    if (this.client.status === "wait") {
      await this.client.connect();
    }
  }
}
