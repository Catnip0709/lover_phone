import { Module } from "@nestjs/common";
import { AgentsModule } from "./agents/agents.module.js";
import { AgentObservabilityController } from "./agents/agent-observability.controller.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { JwtAuthGuard } from "./auth/jwt-auth.guard.js";
import { JwtService } from "./auth/jwt.service.js";
import { PasswordService } from "./auth/password.service.js";
import { ModelProviderService } from "./ai/model-provider.service.js";
import { CharactersController } from "./characters/characters.controller.js";
import { CharactersService } from "./characters/characters.service.js";
import { ConversationsController } from "./conversations/conversations.controller.js";
import { ConversationsService } from "./conversations/conversations.service.js";
import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";
import { PrismaService } from "./infra/prisma.service.js";
import { RedisService } from "./infra/redis.service.js";
import { ApiKeyCryptoService } from "./model-configs/api-key-crypto.service.js";
import { ModelConfigsController } from "./model-configs/model-configs.controller.js";
import { ModelConfigsService } from "./model-configs/model-configs.service.js";
import { UsersController } from "./users/users.controller.js";
import { UsersService } from "./users/users.service.js";

@Module({
  imports: [AgentsModule],
  controllers: [
    AgentObservabilityController,
    AuthController,
    CharactersController,
    ConversationsController,
    HealthController,
    ModelConfigsController,
    UsersController,
  ],
  providers: [
    ApiKeyCryptoService,
    AuthService,
    CharactersService,
    ConversationsService,
    HealthService,
    JwtAuthGuard,
    JwtService,
    ModelConfigsService,
    ModelProviderService,
    PasswordService,
    PrismaService,
    RedisService,
    UsersService,
  ],
})
export class AppModule {}
