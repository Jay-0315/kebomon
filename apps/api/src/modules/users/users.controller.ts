import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UpdateUserSettingsDto } from "./dto/update-user-settings.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id/profile")
  getProfile(@Param("id") id: string) {
    return this.usersService.getProfile(id);
  }

  @Patch(":id/profile")
  updateProfile(@Param("id") id: string, @Body() dto: UpdateUserProfileDto) {
    return this.usersService.updateProfile(id, dto);
  }

  @Patch(":id/settings")
  updateSettings(@Param("id") id: string, @Body() dto: UpdateUserSettingsDto) {
    return this.usersService.updateSettings(id, dto);
  }

  @Patch(":id/photo")
  updateProfilePhoto(@Param("id") id: string, @Body() body: { photo: string | null }) {
    return this.usersService.updateProfilePhoto(id, body.photo);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  deleteUser(@CurrentUser() user: any, @Param("id") id: string) {
    return this.usersService.deleteUser(user.sub, id);
  }
}
