import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminActionLogService } from "./admin-action-log.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/action-log")
export class AdminActionLogController {
  constructor(private readonly adminActionLogService: AdminActionLogService) {}

  @Get()
  findAll(
    @Query("actorId") actorId?: string,
    @Query("action") action?: string,
    @Query("page") page?: string,
  ) {
    return this.adminActionLogService.findAll(actorId, action, page ? Number(page) : 1);
  }
}
