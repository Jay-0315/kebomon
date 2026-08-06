import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminFishingService } from "./admin-fishing.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/fishing")
export class AdminFishingController {
  constructor(private readonly adminFishingService: AdminFishingService) {}

  @Get("rankings")
  getRankings(
    @Query("sort") sort?: "count" | "species",
    @Query("page") page?: string,
  ) {
    return this.adminFishingService.getRankings(sort ?? "count", page ? Number(page) : 1);
  }
}
