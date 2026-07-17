import { Controller, Delete, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminGuildsService } from "./admin-guilds.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/guilds")
export class AdminGuildsController {
  constructor(private readonly adminGuildsService: AdminGuildsService) {}

  @Get()
  findAll(@Query("q") q?: string, @Query("page") page?: string) {
    return this.adminGuildsService.findAll(q, page ? Number(page) : 1);
  }

  @Delete(":id")
  disband(@Param("id") id: string) {
    return this.adminGuildsService.disband(id);
  }
}
