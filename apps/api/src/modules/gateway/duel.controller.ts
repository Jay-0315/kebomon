import { Controller, Get, Param, Query } from "@nestjs/common";
import { DuelGateway } from "./duel.gateway";

@Controller("duel")
export class DuelController {
  constructor(private readonly duel: DuelGateway) {}

  @Get("ranking")
  getRanking(@Query("limit") limit?: string) {
    const n = Number(limit);
    return this.duel.getRanking(Number.isFinite(n) && n > 0 ? n : undefined);
  }

  @Get("stats/:userId")
  getStats(@Param("userId") userId: string) {
    return this.duel.getUserStats(userId);
  }
}
