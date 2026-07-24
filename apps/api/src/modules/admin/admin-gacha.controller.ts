import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminGachaService } from "./admin-gacha.service";
import { UpdateGachaConfigDto } from "./dto/update-gacha-config.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/gacha-config")
export class AdminGachaController {
  constructor(private readonly adminGachaService: AdminGachaService) {}

  @Get()
  getConfig() {
    return this.adminGachaService.getConfig();
  }

  @Patch()
  updateConfig(@CurrentUser() requester: { sub: string }, @Body() dto: UpdateGachaConfigDto) {
    return this.adminGachaService.updateConfig(requester.sub, dto);
  }
}
