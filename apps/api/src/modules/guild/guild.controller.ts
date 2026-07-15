import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { GuildService } from "./guild.service";

@Controller("guild")
export class GuildController {
  constructor(private readonly guildService: GuildService) {}

  @Get("list")
  listGuilds(@Query("search") search?: string) {
    return this.guildService.listGuilds(search);
  }

  @Get("mine")
  getMyGuild(@Query("userId") userId: string) {
    return this.guildService.getMyGuild(userId);
  }

  @Post("create")
  createGuild(@Body() body: { userId: string; name: string; notice?: string }) {
    return this.guildService.createGuild(body.userId, body.name, body.notice);
  }

  @Post("leave")
  leaveGuild(@Body() body: { userId: string }) {
    return this.guildService.leaveGuild(body.userId);
  }

  @Post("disband")
  disbandGuild(@Body() body: { userId: string }) {
    return this.guildService.disbandGuild(body.userId);
  }

  @Post("transfer-ownership")
  transferOwnership(@Body() body: { userId: string; targetUserId: string }) {
    return this.guildService.transferOwnership(body.userId, body.targetUserId);
  }

  @Post("kick")
  kickMember(@Body() body: { userId: string; targetUserId: string }) {
    return this.guildService.kickMember(body.userId, body.targetUserId);
  }

  @Patch("member-role")
  setMemberRole(@Body() body: { userId: string; targetUserId: string; role: "officer" | "member" }) {
    return this.guildService.setMemberRole(body.userId, body.targetUserId, body.role);
  }

  @Patch("notice")
  updateNotice(@Body() body: { userId: string; notice: string }) {
    return this.guildService.updateNotice(body.userId, body.notice);
  }

  @Patch("icon")
  updateIcon(@Body() body: { userId: string; iconId: string }) {
    return this.guildService.updateIcon(body.userId, body.iconId);
  }

  // ─── 가입 신청 ──────────────────────────────────────────────────────────────
  @Post("apply")
  applyToGuild(@Body() body: { userId: string; guildId: string; message?: string }) {
    return this.guildService.applyToGuild(body.userId, body.guildId, body.message);
  }

  @Get("applications/mine")
  listMyApplications(@Query("userId") userId: string) {
    return this.guildService.listMyApplications(userId);
  }

  @Get("applications")
  listApplications(@Query("userId") userId: string, @Query("guildId") guildId: string) {
    return this.guildService.listApplications(userId, guildId);
  }

  @Post("applications/:id/approve")
  approveApplication(@Param("id") id: string, @Body() body: { userId: string }) {
    return this.guildService.approveApplication(body.userId, id);
  }

  @Post("applications/:id/reject")
  rejectApplication(@Param("id") id: string, @Body() body: { userId: string }) {
    return this.guildService.rejectApplication(body.userId, id);
  }

  @Delete("applications/:id")
  cancelApplication(@Param("id") id: string, @Query("userId") userId: string) {
    return this.guildService.cancelApplication(userId, id);
  }

  // ─── 길드 주간 보스전 ────────────────────────────────────────────────────────
  @Get("boss/state")
  getBossState(@Query("userId") userId: string) {
    return this.guildService.getBossState(userId);
  }

  @Post("boss/attack")
  attackBoss(@Body() body: { userId: string }) {
    return this.guildService.attackBoss(body.userId);
  }

  // ─── 길드 게시판 ────────────────────────────────────────────────────────────
  @Get("board")
  listBoardPosts(@Query("userId") userId: string, @Query("page") page?: string) {
    return this.guildService.listBoardPosts(userId, page ? Number(page) : 1);
  }

  @Post("board")
  createBoardPost(@Body() body: { userId: string; content: string; imageUrl?: string }) {
    return this.guildService.createBoardPost(body.userId, body.content, body.imageUrl);
  }
}
