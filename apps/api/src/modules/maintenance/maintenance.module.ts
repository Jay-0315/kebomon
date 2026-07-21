import { Module } from "@nestjs/common";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceMiddleware } from "./maintenance.middleware";
import { MaintenanceCacheService } from "./maintenance-cache.service";

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceMiddleware, MaintenanceCacheService],
  exports: [MaintenanceMiddleware, MaintenanceCacheService],
})
export class MaintenanceModule {}
