import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { GuildService } from "./guild.service";

@Controller("guild")
export class GuildController {
  constructor(private readonly guildService: GuildService) {}

  @Get("list")
  listGuilds(@Query("search") search?: string) {
    return this.guildService.listGuilds(search);
  }

  @UseGuards(JwtAuthGuard)
  @Get("mine")
  getMyGuild(@CurrentUser() user: { sub: string }) {
    return this.guildService.getMyGuild(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("create")
  createGuild(
    @CurrentUser() user: { sub: string },
    @Body() body: { name: string; notice?: string; iconId?: string },
  ) {
    return this.guildService.createGuild(user.sub, body.name, body.notice, body.iconId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("leave")
  leaveGuild(@CurrentUser() user: { sub: string }) {
    return this.guildService.leaveGuild(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("disband")
  disbandGuild(@CurrentUser() user: { sub: string }) {
    return this.guildService.disbandGuild(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("transfer-ownership")
  transferOwnership(@CurrentUser() user: { sub: string }, @Body() body: { targetUserId: string }) {
    return this.guildService.transferOwnership(user.sub, body.targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("kick")
  kickMember(@CurrentUser() user: { sub: string }, @Body() body: { targetUserId: string }) {
    return this.guildService.kickMember(user.sub, body.targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("member-role")
  setMemberRole(
    @CurrentUser() user: { sub: string },
    @Body() body: { targetUserId: string; role: "officer" | "member" },
  ) {
    return this.guildService.setMemberRole(user.sub, body.targetUserId, body.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("notice")
  updateNotice(@CurrentUser() user: { sub: string }, @Body() body: { notice: string }) {
    return this.guildService.updateNotice(user.sub, body.notice);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("icon")
  updateIcon(@CurrentUser() user: { sub: string }, @Body() body: { iconId: string }) {
    return this.guildService.updateIcon(user.sub, body.iconId);
  }

  // ─── 가입 신청 ──────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post("apply")
  applyToGuild(
    @CurrentUser() user: { sub: string },
    @Body() body: { guildId: string; message?: string },
  ) {
    return this.guildService.applyToGuild(user.sub, body.guildId, body.message);
  }

  @UseGuards(JwtAuthGuard)
  @Get("applications/mine")
  listMyApplications(@CurrentUser() user: { sub: string }) {
    return this.guildService.listMyApplications(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("applications")
  listApplications(@CurrentUser() user: { sub: string }, @Query("guildId") guildId: string) {
    return this.guildService.listApplications(user.sub, guildId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("applications/:id/approve")
  approveApplication(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.guildService.approveApplication(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("applications/:id/reject")
  rejectApplication(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.guildService.rejectApplication(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("applications/:id")
  cancelApplication(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.guildService.cancelApplication(user.sub, id);
  }

  // ─── 길드 주간 보스전 ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get("boss/state")
  getBossState(@CurrentUser() user: { sub: string }) {
    return this.guildService.getBossState(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("boss/attack")
  attackBoss(@CurrentUser() user: { sub: string }) {
    return this.guildService.attackBoss(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("raid-deck")
  getRaidDeck(@CurrentUser() user: { sub: string }) {
    return this.guildService.getRaidDeck(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put("raid-deck")
  saveRaidDeck(@CurrentUser() user: { sub: string }, @Body() body: { slots: number[] }) {
    return this.guildService.saveRaidDeck(user.sub, body.slots);
  }

  // ─── 길드 게시판 ────────────────────────────────────────────────────────────
  @Get("board")
  listBoardPosts(@Query("userId") userId: string, @Query("page") page?: string) {
    return this.guildService.listBoardPosts(userId, page ? Number(page) : 1);
  }

  @UseGuards(JwtAuthGuard)
  @Post("board")
  createBoardPost(
    @CurrentUser() user: { sub: string },
    @Body() body: { content: string; imageUrl?: string },
  ) {
    return this.guildService.createBoardPost(user.sub, body.content, body.imageUrl);
  }
}
