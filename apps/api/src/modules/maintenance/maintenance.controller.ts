import { Controller, Get } from "@nestjs/common";
import { MaintenanceCacheService } from "./maintenance-cache.service";

@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly cache: MaintenanceCacheService) {}

  @Get("status")
  async getStatus() {
    return this.cache.getConfig();
  }
}
