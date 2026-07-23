import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminUsersService } from "./admin-users.service";
import { AdjustUserRewardDto } from "./dto/adjust-user-reward.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
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

  @Patch(":id/reward")
  adjustReward(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() dto: AdjustUserRewardDto,
  ) {
    return this.adminUsersService.adjustReward(requester.sub, id, dto);
  }
}
