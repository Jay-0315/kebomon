import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminRogueService } from "./admin-rogue.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/rogue")
export class AdminRogueController {
  constructor(private readonly adminRogueService: AdminRogueService) {}

  @Get("rankings")
  getRankings(
    @Query("sort") sort?: "clears" | "challenge",
    @Query("page") page?: string,
  ) {
    return this.adminRogueService.getRankings(sort ?? "clears", page ? Number(page) : 1);
  }
}
