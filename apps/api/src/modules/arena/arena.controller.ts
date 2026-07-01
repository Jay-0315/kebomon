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
}
