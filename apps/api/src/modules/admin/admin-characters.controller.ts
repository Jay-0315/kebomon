import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SUPER_ADMIN_ROLES } from "../auth/roles.constants";
import { AdminCharactersService } from "./admin-characters.service";
import { UpdateCharacterDto } from "./dto/update-character.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...SUPER_ADMIN_ROLES)
@Controller("admin/characters")
export class AdminCharactersController {
  constructor(private readonly adminCharactersService: AdminCharactersService) {}

  @Get()
  findAll() {
    return this.adminCharactersService.findAll();
  }

  @Patch(":id")
  update(
    @CurrentUser() requester: { sub: string },
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCharacterDto,
  ) {
    return this.adminCharactersService.update(requester.sub, id, dto);
  }
}
