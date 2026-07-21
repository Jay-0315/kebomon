import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
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

  /** 이름으로 유저 검색 (공개, 이메일 등 비공개 필드 제외) */
  @Get("search")
  searchUsers(@Query("q") q?: string) {
    return this.usersService.searchUsers(q ?? "");
  }

  /** 랭킹 등에서 다른 유저를 조회할 때 쓰는 공개 프로필 (이메일/설정 등 비공개 필드 제외) */
  @Get(":id/public-profile")
  getPublicProfile(@Param("id") id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/profile")
  updateProfile(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    if (id !== user.sub) throw new ForbiddenException("본인 계정만 수정할 수 있습니다.");
    return this.usersService.updateProfile(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/settings")
  updateSettings(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    if (id !== user.sub) throw new ForbiddenException("본인 계정만 수정할 수 있습니다.");
    return this.usersService.updateSettings(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/photo")
  updateProfilePhoto(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() body: { photo: string | null },
  ) {
    if (id !== user.sub) throw new ForbiddenException("본인 계정만 수정할 수 있습니다.");
    return this.usersService.updateProfilePhoto(id, body.photo);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  deleteUser(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.usersService.deleteUser(user.sub, id);
  }
}
