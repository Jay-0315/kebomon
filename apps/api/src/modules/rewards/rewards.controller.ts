import { Body, Controller, Get, Patch, Post, Query } from "@nestjs/common";
import { RewardsService } from "./rewards.service";

@Controller("rewards")
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get("summary")
  getSummary(@Query("userId") userId: string) {
    return this.rewardsService.getSummary(userId);
  }

  @Post("starter")
  selectStarter(@Body() body: { userId: string; characterId: number }) {
    return this.rewardsService.selectStarter(body.userId, body.characterId);
  }

  @Patch("equip")
  equipCharacter(@Body() body: { userId: string; characterId: number }) {
    return this.rewardsService.equipCharacter(body.userId, body.characterId);
  }

  @Post("gacha")
  performGacha(@Body() body: { userId: string; count: 1 | 10 }) {
    return this.rewardsService.performGacha(body.userId, body.count);
  }

  @Post("egg/open")
  openEgg(@Body() body: { userId: string; eggType: "normal" | "big" | "golden" }) {
    return this.rewardsService.openEgg(body.userId, body.eggType);
  }

  @Post("egg/open-batch")
  openEggBatch(@Body() body: { userId: string; eggType: "normal" | "big" | "golden"; count: number }) {
    return this.rewardsService.openEggBatch(body.userId, body.eggType, body.count);
  }

  @Post("achievements/check")
  checkAchievements(@Body() body: { userId: string }) {
    return this.rewardsService.checkAndGrantAchievements(body.userId);
  }

  @Post("titles/equip")
  equipTitle(@Body() body: { userId: string; titleId: number }) {
    return this.rewardsService.equipTitle(body.userId, body.titleId);
  }

  @Post("titles/unequip")
  unequipTitle(@Body() body: { userId: string }) {
    return this.rewardsService.unequipTitle(body.userId);
  }

  @Post("titles/check")
  checkTitles(@Body() body: { userId: string }) {
    return this.rewardsService.checkAndGrantTitles(body.userId);
  }

  @Post("attendance/claim")
  claimAttendance(@Body() body: { userId: string }) {
    return this.rewardsService.claimAttendance(body.userId);
  }

  @Get("colosseum-rankings")
  getColosseumRankings() {
    return this.rewardsService.getColosseumRankings();
  }

  @Get("battle-stats")
  getBattleStats(@Query("userId") userId: string) {
    return this.rewardsService.getBattleStats(userId);
  }

  @Post("shop/buy")
  buyShopItem(@Body() body: { userId: string; itemId: string; quantity?: number }) {
    return this.rewardsService.buyShopItem(body.userId, body.itemId, body.quantity ?? 1);
  }

  @Post("enhance")
  enhanceCharacter(@Body() body: { userId: string; characterId: number }) {
    return this.rewardsService.enhanceCharacter(body.userId, body.characterId);
  }

  @Get("colosseum-stats")
  getColosseumStats(@Query("userId") userId: string) {
    return this.rewardsService.getBattleStats(userId);
  }

  @Post("season/grant-rank-titles")
  grantSeasonRankTitles(@Body() body: { seasonId: number }) {
    return this.rewardsService.grantSeasonRankTitles(body.seasonId ?? 1);
  }
}
