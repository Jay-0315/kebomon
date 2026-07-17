import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminBattlesService } from "./admin-battles.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/battles")
export class AdminBattlesController {
  constructor(private readonly adminBattlesService: AdminBattlesService) {}

  @Get("colosseum")
  listColosseum(
    @Query("sort") sort?: "winrate" | "tierpoints" | "streak",
    @Query("page") page?: string,
  ) {
    return this.adminBattlesService.listColosseum(sort ?? "winrate", page ? Number(page) : 1);
  }

  @Get("duel")
  listDuel(
    @Query("sort") sort?: "winrate" | "tierpoints" | "streak",
    @Query("page") page?: string,
  ) {
    return this.adminBattlesService.listDuel(sort ?? "winrate", page ? Number(page) : 1);
  }
}
