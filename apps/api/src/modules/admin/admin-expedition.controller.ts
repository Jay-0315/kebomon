import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminExpeditionService } from "./admin-expedition.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/expedition")
export class AdminExpeditionController {
  constructor(private readonly adminExpeditionService: AdminExpeditionService) {}

  @Get("active")
  getActive() {
    return this.adminExpeditionService.getActive();
  }
}
