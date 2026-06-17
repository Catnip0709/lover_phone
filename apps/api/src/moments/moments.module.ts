import { Module } from "@nestjs/common";
import { AgentsModule } from "../agents/agents.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { SharedModule } from "../shared/shared.module.js";
import { MomentsAgentService } from "./moments-agent.service.js";
import { MomentsController } from "./moments.controller.js";
import { MomentsSchedulingService } from "./moments-scheduling.service.js";
import { MomentsService } from "./moments.service.js";

@Module({
  imports: [AgentsModule, AuthModule, SharedModule],
  controllers: [MomentsController],
  providers: [MomentsService, MomentsAgentService, MomentsSchedulingService],
  exports: [MomentsService, MomentsAgentService, MomentsSchedulingService],
})
export class MomentsModule {}
