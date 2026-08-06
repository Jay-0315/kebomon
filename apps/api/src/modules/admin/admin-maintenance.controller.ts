import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SUPER_ADMIN_ROLES } from "../auth/roles.constants";
import { AdminMaintenanceService } from "./admin-maintenance.service";
import { UpdateMaintenanceConfigDto } from "./dto/update-maintenance-config.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
@Controller("admin/maintenance")
export class AdminMaintenanceController {
  constructor(private readonly adminMaintenanceService: AdminMaintenanceService) {}

  @Get()
  getConfig() {
    return this.adminMaintenanceService.getConfig();
  }

  @Patch()
  updateConfig(@CurrentUser() requester: { sub: string }, @Body() dto: UpdateMaintenanceConfigDto) {
    return this.adminMaintenanceService.updateConfig(requester.sub, dto);
  }
}
