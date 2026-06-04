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
}
