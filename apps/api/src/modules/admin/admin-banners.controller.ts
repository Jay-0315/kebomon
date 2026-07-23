import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminBannersService } from "./admin-banners.service";
import { UpsertBannerDto } from "./dto/upsert-banner.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/banners")
export class AdminBannersController {
  constructor(private readonly adminBannersService: AdminBannersService) {}

  @Get()
  findAll() {
    return this.adminBannersService.findAll();
  }

  @Post()
  create(@Body() dto: UpsertBannerDto) {
    return this.adminBannersService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpsertBannerDto) {
    return this.adminBannersService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.adminBannersService.remove(id);
  }
}
