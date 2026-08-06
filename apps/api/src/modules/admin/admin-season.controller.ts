import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SUPER_ADMIN_ROLES } from "../auth/roles.constants";
import { AdminSeasonService } from "./admin-season.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
@Controller("admin/season")
export class AdminSeasonController {
  constructor(private readonly adminSeasonService: AdminSeasonService) {}

  @Get()
  getPreview() {
    return this.adminSeasonService.getPreview();
  }

  @Post("force-reset")
  forceReset(@CurrentUser() requester: { sub: string }) {
    return this.adminSeasonService.forceReset(requester.sub);
  }
}
