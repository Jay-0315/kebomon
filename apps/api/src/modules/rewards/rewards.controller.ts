import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { RewardsService } from "./rewards.service";

@Controller("rewards")
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get("summary")
  getSummary(@Query("userId") userId: string) {
    return this.rewardsService.getSummary(userId);
  }

  /** 캐릭터별 등급/로그라이크 역할 (관리자 조정값) — 로그인 불필요 */
  @Get("character-master")
  getCharacterMasterPublic() {
    return this.rewardsService.getCharacterMasterPublic();
  }

  /** 뽑기 확률/천장 (관리자 조정값) — 로그인 불필요 */
  @Get("gacha-config")
  getGachaConfigPublic() {
    return this.rewardsService.getGachaConfigPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Post("starter")
  selectStarter(@CurrentUser() user: { sub: string }, @Body() body: { characterId: number }) {
    return this.rewardsService.selectStarter(user.sub, body.characterId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("equip")
  equipCharacter(@CurrentUser() user: { sub: string }, @Body() body: { characterId: number }) {
    return this.rewardsService.equipCharacter(user.sub, body.characterId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("gacha")
  performGacha(@CurrentUser() user: { sub: string }, @Body() body: { count: 1 | 10 }) {
    return this.rewardsService.performGacha(user.sub, body.count);
  }

  @UseGuards(JwtAuthGuard)
  @Post("egg/open")
  openEgg(@CurrentUser() user: { sub: string }, @Body() body: { eggType: "normal" | "big" | "golden" }) {
    return this.rewardsService.openEgg(user.sub, body.eggType);
  }

  @UseGuards(JwtAuthGuard)
  @Post("egg/open-batch")
  openEggBatch(
    @CurrentUser() user: { sub: string },
    @Body() body: { eggType: "normal" | "big" | "golden"; count: number },
  ) {
    return this.rewardsService.openEggBatch(user.sub, body.eggType, body.count);
  }

  @UseGuards(JwtAuthGuard)
  @Post("achievements/check")
  checkAchievements(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.checkAndGrantAchievements(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("titles/equip")
  equipTitle(@CurrentUser() user: { sub: string }, @Body() body: { titleId: number }) {
    return this.rewardsService.equipTitle(user.sub, body.titleId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("titles/unequip")
  unequipTitle(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.unequipTitle(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("titles/check")
  checkTitles(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.checkAndGrantTitles(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("borders/equip")
  equipBorder(@CurrentUser() user: { sub: string }, @Body() body: { borderId: string }) {
    return this.rewardsService.equipBorder(user.sub, body.borderId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("borders/unequip")
  unequipBorder(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.unequipBorder(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("ping")
  ping(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.recordAttendance(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("attendance/claim")
  claimAttendance(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.claimAttendance(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("quests/today")
  getTodayQuests(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.getTodayQuests(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("quests/claim")
  claimQuestBonus(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.claimQuestBonus(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("quests/weekly")
  getThisWeekQuests(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.getThisWeekQuests(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("quests/weekly/claim")
  claimWeeklyQuestBonus(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.claimWeeklyQuestBonus(user.sub);
  }

  @Get("colosseum-rankings")
  getColosseumRankings() {
    return this.rewardsService.getColosseumRankings();
  }

  @Get("battle-stats")
  getBattleStats(@Query("userId") userId: string) {
    return this.rewardsService.getBattleStats(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("shop/buy")
  buyShopItem(
    @CurrentUser() user: { sub: string },
    @Body() body: { itemId: string; quantity?: number },
  ) {
    return this.rewardsService.buyShopItem(user.sub, body.itemId, body.quantity ?? 1);
  }

  @UseGuards(JwtAuthGuard)
  @Post("enhance")
  enhanceCharacter(@CurrentUser() user: { sub: string }, @Body() body: { characterId: number }) {
    return this.rewardsService.enhanceCharacter(user.sub, body.characterId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("breed")
  breedCharacter(@CurrentUser() user: { sub: string }, @Body() body: { rarity: string }) {
    return this.rewardsService.breedCharacter(user.sub, body.rarity);
  }

  @Get("colosseum-stats")
  getColosseumStats(@Query("userId") userId: string) {
    return this.rewardsService.getBattleStats(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("expedition/start")
  startExpedition(
    @CurrentUser() user: { sub: string },
    @Body() body: { regionId: string; partyIds: number[]; durationHours: number },
  ) {
    return this.rewardsService.startExpedition(user.sub, body.regionId, body.partyIds, body.durationHours);
  }

  @Get("expedition/state")
  getExpeditionState(@Query("userId") userId: string) {
    return this.rewardsService.getExpeditionState(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("expedition/event")
  resolveExpeditionEvent(@CurrentUser() user: { sub: string }, @Body() body: { risky: boolean }) {
    return this.rewardsService.resolveExpeditionEvent(user.sub, body.risky);
  }

  @UseGuards(JwtAuthGuard)
  @Post("expedition/complete")
  completeExpedition(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.completeExpedition(user.sub);
  }

  /** 로그라이크/도전 모드 런 시작 기록 — complete/submit 시 실제 플레이 시간 검증에 사용 */
  @UseGuards(JwtAuthGuard)
  @Post("run/start")
  startRun(@CurrentUser() user: { sub: string }) {
    return this.rewardsService.startRun(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("rogue/complete")
  completeRogue(@CurrentUser() user: { sub: string }, @Body() body: { difficulty?: string }) {
    return this.rewardsService.completeRogue(user.sub, body.difficulty);
  }

  @UseGuards(JwtAuthGuard)
  @Post("challenge/submit")
  submitChallenge(@CurrentUser() user: { sub: string }, @Body() body: { stage: number }) {
    return this.rewardsService.submitChallenge(user.sub, body.stage);
  }

  @Get("challenge-rankings")
  getChallengeRankings() {
    return this.rewardsService.getChallengeRankings();
  }

  @UseGuards(JwtAuthGuard)
  @Get("hall-of-fame")
  getHallOfFame() {
    return this.rewardsService.getHallOfFame();
  }
}
