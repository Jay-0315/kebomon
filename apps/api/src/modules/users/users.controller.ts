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

  /** 랭킹 등에서 다른 유저를 조회할 때 쓰는 공개 프로필 (이메일/설정 등 비공개 필드 제외) */
  @Get(":id/public-profile")
  getPublicProfile(@Param("id") id: string) {
    return this.usersService.getPublicProfile(id);
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
