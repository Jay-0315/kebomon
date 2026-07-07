import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ArenaService } from "./arena.service";

@Controller("arena")
export class ArenaController {
  constructor(private readonly arena: ArenaService) {}

  /** 내 덱 + 전적 조회 */
  @Get("my")
  getMyData(@Query("userId") userId: string) {
    return this.arena.getMyData(userId);
  }

  /** 공격/방어 덱 저장 */
  @Put("deck")
  saveDeck(
    @Body() body: { userId: string; deckType: "attack" | "defense"; slots: number[] },
  ) {
    return this.arena.saveDeck(body.userId, body.deckType, body.slots);
  }

  /** 특정 유저 방어 덱 미리보기 (공격 전 확인용) */
  @Get("defense/:targetId")
  getDefenseDeck(@Param("targetId") targetId: string) {
    return this.arena.getDefenseDeck(targetId);
  }

  /** 배틀 실행 */
  @Post("attack/:defenderId")
  attack(
    @Param("defenderId") defenderId: string,
    @Body() body: { userId: string },
  ) {
    return this.arena.attack(body.userId, defenderId);
  }

  /** NPC 전투 실행 */
  @Post("attack-npc")
  attackNpc(
    @Body() body: {
      userId: string;
      npcSlots: number[];
      npcEnhLvs: number[];
      pointsOnWin: number;
      pointsOnLoss: number;
    },
  ) {
    return this.arena.attackNpc(
      body.userId, body.npcSlots, body.npcEnhLvs,
      body.pointsOnWin, body.pointsOnLoss,
    );
  }

  /** 복수 대상 목록 (나를 공격한 유저) */
  @Get("revenge/:userId")
  getRevengeTargets(@Param("userId") userId: string) {
    return this.arena.getRevengeTargets(userId);
  }

  /** 전투 기록 목록 (내가 공격한 것 + 나를 공격한 것) */
  @Get("history/:userId")
  getBattleHistory(@Param("userId") userId: string) {
    return this.arena.getBattleHistory(userId);
  }

  /** 특정 전투의 리플레이 데이터 */
  @Get("replay/:id")
  getBattleReplay(@Param("id") id: string, @Query("userId") userId: string) {
    return this.arena.getBattleReplay(id, userId);
  }
}
