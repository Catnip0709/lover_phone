import { Module } from "@nestjs/common";
import { ModelProviderService } from "../ai/model-provider.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { PrismaService } from "../infra/prisma.service.js";
import { AgentActionExecutorService } from "./agent-action-executor.service.js";
import { AgentContextService } from "./agent-context.service.js";
import { AgentHarnessService } from "./agent-harness.service.js";
import { AgentMemoryService } from "./agent-memory.service.js";
import { AgentObservabilityService } from "./agent-observability.service.js";
import { AgentPolicyService } from "./agent-policy.service.js";
import { AgentPromptService } from "./agent-prompt.service.js";
import { AgentRuntimeService } from "./agent-runtime.service.js";
import { AgentToolRegistryService } from "./agent-tool-registry.service.js";
import { MockMcpToolAdapterService } from "./mcp-tool-adapter.service.js";
import { MemoriesController } from "./memories.controller.js";
import { MemoriesService } from "./memories.service.js";

@Module({
  imports: [AuthModule],
  controllers: [MemoriesController],
  providers: [
    AgentActionExecutorService,
    AgentContextService,
    AgentHarnessService,
    AgentMemoryService,
    AgentObservabilityService,
    AgentPolicyService,
    AgentPromptService,
    AgentRuntimeService,
    AgentToolRegistryService,
    MockMcpToolAdapterService,
    ModelProviderService,
    PrismaService,
    MemoriesService,
  ],
  exports: [
    AgentActionExecutorService,
    AgentContextService,
    AgentHarnessService,
    AgentMemoryService,
    AgentObservabilityService,
    AgentPolicyService,
    AgentPromptService,
    AgentRuntimeService,
    AgentToolRegistryService,
    MockMcpToolAdapterService,
  ],
})
export class AgentsModule {}
