import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from "../auth/roles.constants";
import { AdminUsersService } from "./admin-users.service";
import { AdjustUserRewardDto } from "./dto/adjust-user-reward.dto";
import { BulkAdjustRewardDto } from "./dto/bulk-adjust-reward.dto";
import { BulkAdjustRewardSelectedDto } from "./dto/bulk-adjust-reward-selected.dto";
import { GrantTitleDto } from "./dto/grant-title.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  findAll(
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDir") sortDir?: string,
  ) {
    return this.adminUsersService.findAll(q, role, status, page ? Number(page) : 1, sortBy, sortDir);
  }

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="users.csv"')
  exportCsv(
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
  ) {
    return this.adminUsersService.exportCsv(q, role, status);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.adminUsersService.findById(id);
  }

  @Get(":id/activity-log")
  getActivityLog(@Param("id") id: string) {
    return this.adminUsersService.getActivityLog(id);
  }

  @Get(":id/suspension-history")
  getSuspensionHistory(@Param("id") id: string) {
    return this.adminUsersService.getSuspensionHistory(id);
  }

  @Roles(...SUPER_ADMIN_ROLES)
  @Patch(":id/role")
  updateRole(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateRole(requester.sub, id, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateStatus(requester.sub, id, dto);
  }

  @Roles(...SUPER_ADMIN_ROLES)
  @Patch(":id/reward")
  adjustReward(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() dto: AdjustUserRewardDto,
  ) {
    return this.adminUsersService.adjustReward(requester.sub, id, dto);
  }

  @Roles(...SUPER_ADMIN_ROLES)
  @Post("bulk-reward")
  bulkAdjustReward(
    @CurrentUser() requester: { sub: string },
    @Body() dto: BulkAdjustRewardDto,
  ) {
    return this.adminUsersService.bulkAdjustReward(requester.sub, dto);
  }

  @Roles(...SUPER_ADMIN_ROLES)
  @Post("bulk-reward-selected")
  bulkAdjustRewardSelected(
    @CurrentUser() requester: { sub: string },
    @Body() dto: BulkAdjustRewardSelectedDto,
  ) {
    return this.adminUsersService.bulkAdjustRewardSelected(requester.sub, dto);
  }

  @Roles(...SUPER_ADMIN_ROLES)
  @Post(":id/titles")
  grantTitle(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() dto: GrantTitleDto,
  ) {
    return this.adminUsersService.grantTitle(requester.sub, id, dto.titleId);
  }

  @Roles(...SUPER_ADMIN_ROLES)
  @Delete(":id/titles/:titleId")
  revokeTitle(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Param("titleId") titleId: string,
  ) {
    return this.adminUsersService.revokeTitle(requester.sub, id, Number(titleId));
  }
}
