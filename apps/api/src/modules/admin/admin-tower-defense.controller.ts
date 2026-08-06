import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminTowerDefenseService } from "./admin-tower-defense.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/tower-defense")
export class AdminTowerDefenseController {
  constructor(private readonly adminTowerDefenseService: AdminTowerDefenseService) {}

  @Get("rankings")
  getRankings() {
    return this.adminTowerDefenseService.getRankings();
  }

  @Post("users/:id/reset")
  resetBestWave(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminTowerDefenseService.resetBestWave(requester.sub, id, body?.reason);
  }
}
