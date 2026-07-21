import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminMaintenanceService } from "./admin-maintenance.service";
import { UpdateMaintenanceConfigDto } from "./dto/update-maintenance-config.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/maintenance")
export class AdminMaintenanceController {
  constructor(private readonly adminMaintenanceService: AdminMaintenanceService) {}

  @Get()
  getConfig() {
    return this.adminMaintenanceService.getConfig();
  }

  @Patch()
  updateConfig(@Body() dto: UpdateMaintenanceConfigDto) {
    return this.adminMaintenanceService.updateConfig(dto);
  }
}
