import { Controller, Delete, Get, Param, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminGuildsService } from "./admin-guilds.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/guilds")
export class AdminGuildsController {
  constructor(private readonly adminGuildsService: AdminGuildsService) {}

  @Get()
  findAll(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDir") sortDir?: string,
  ) {
    return this.adminGuildsService.findAll(q, page ? Number(page) : 1, sortBy, sortDir);
  }

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.adminGuildsService.findById(id);
  }

  @Delete(":id")
  disband(@CurrentUser() requester: { sub: string }, @Param("id") id: string) {
    return this.adminGuildsService.disband(requester.sub, id);
  }
}
