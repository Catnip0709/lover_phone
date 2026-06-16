import { Controller, Get, Inject } from "@nestjs/common";
import type { HealthStatus } from "@myphone/shared";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }
}
