import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { ArenaService } from "./arena.service";

@Controller("arena")
export class ArenaController {
  constructor(private readonly arena: ArenaService) {}

  /** 내 덱 + 전적 조회 */
  @UseGuards(JwtAuthGuard)
  @Get("my")
  getMyData(@CurrentUser() user: { sub: string }) {
    return this.arena.getMyData(user.sub);
  }

  /** 입장권 상태 조회 (일일 리셋 + 자연 회복 서버 계산) */
  @UseGuards(JwtAuthGuard)
  @Get("tickets")
  getTickets(@CurrentUser() user: { sub: string }) {
    return this.arena.getTicketState(user.sub);
  }

  /** 공격/방어 덱 저장 */
  @UseGuards(JwtAuthGuard)
  @Put("deck")
  saveDeck(
    @CurrentUser() user: { sub: string },
    @Body() body: { deckType: "attack" | "defense"; slots: number[] },
  ) {
    return this.arena.saveDeck(user.sub, body.deckType, body.slots);
  }

  /** 특정 유저 방어 덱 미리보기 (공격 전 확인용) */
  @Get("defense/:targetId")
  getDefenseDeck(@Param("targetId") targetId: string) {
    return this.arena.getDefenseDeck(targetId);
  }

  /** 배틀 실행 */
  @UseGuards(JwtAuthGuard)
  @Post("attack/:defenderId")
  attack(@CurrentUser() user: { sub: string }, @Param("defenderId") defenderId: string) {
    return this.arena.attack(user.sub, defenderId);
  }

  /** NPC 전투 실행 — NPC 스탯/보상은 서버가 npcId로 직접 조회 (클라이언트 값 신뢰 안 함) */
  @UseGuards(JwtAuthGuard)
  @Post("attack-npc")
  attackNpc(@CurrentUser() user: { sub: string }, @Body() body: { npcId: string }) {
    return this.arena.attackNpc(user.sub, body.npcId);
  }

  /** 복수 대상 목록 (나를 공격한 유저) */
  @UseGuards(JwtAuthGuard)
  @Get("revenge/:userId")
  getRevengeTargets(@CurrentUser() user: { sub: string }) {
    return this.arena.getRevengeTargets(user.sub);
  }

  /** 전투 기록 목록 (내가 공격한 것 + 나를 공격한 것) */
  @UseGuards(JwtAuthGuard)
  @Get("history/:userId")
  getBattleHistory(@CurrentUser() user: { sub: string }) {
    return this.arena.getBattleHistory(user.sub);
  }

  /** 특정 전투의 리플레이 데이터 */
  @Get("replay/:id")
  getBattleReplay(@Param("id") id: string, @Query("userId") userId: string) {
    return this.arena.getBattleReplay(id, userId);
  }
}
