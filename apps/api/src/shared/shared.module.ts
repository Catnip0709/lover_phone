import { Module } from "@nestjs/common";
import { PrismaService } from "../infra/prisma.service.js";
import { RedisService } from "../infra/redis.service.js";
import { ApiKeyCryptoService } from "../model-configs/api-key-crypto.service.js";

@Module({
  providers: [PrismaService, RedisService, ApiKeyCryptoService],
  exports: [PrismaService, RedisService, ApiKeyCryptoService],
})
export class SharedModule {}
