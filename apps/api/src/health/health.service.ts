import { Inject, Injectable } from "@nestjs/common";
import type { HealthStatus } from "@myphone/shared";
import { PrismaService } from "../infra/prisma.service.js";
import { RedisService } from "../infra/redis.service.js";

@Injectable()
export class HealthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(RedisService)
    private readonly redis: RedisService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const [database, redis] = await Promise.all([
      this.prisma.ping(),
      this.redis.ping(),
    ]);

    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: database ? "ok" : "error",
        redis: redis ? "ok" : "error",
      },
    };
  }
}
