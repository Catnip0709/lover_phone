import { Controller, Get, Inject, Param, Req, UseGuards } from "@nestjs/common";
import type { AgentReplayPayload, AgentTraceView } from "@myphone/shared";
import type { AuthenticatedRequest } from "../auth/auth.types.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AgentObservabilityService } from "./agent-observability.service.js";

@Controller("agents")
@UseGuards(JwtAuthGuard)
export class AgentObservabilityController {
  constructor(
    @Inject(AgentObservabilityService)
    private readonly observability: AgentObservabilityService,
  ) {}

  @Get("runs/:id/trace")
  getRunTrace(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<AgentTraceView> {
    return this.observability.getRunTrace(this.userId(request), id);
  }

  @Get("runs/:id/replay")
  getReplayPayload(
    @Req() request: AuthenticatedRequest,
    @Param("id") id: string,
  ): Promise<AgentReplayPayload> {
    return this.observability.getReplayPayload(this.userId(request), id);
  }

  @Get("traces/:traceId")
  getTrace(
    @Req() request: AuthenticatedRequest,
    @Param("traceId") traceId: string,
  ): Promise<AgentTraceView> {
    return this.observability.getTrace(this.userId(request), traceId);
  }

  private userId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated user missing");
    }

    return request.user.id;
  }
}
