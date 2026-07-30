import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { TowerDefenseService } from "./tower-defense.service";

@UseGuards(JwtAuthGuard)
@Controller("tower-defense")
export class TowerDefenseController {
  constructor(private readonly towerDefenseService: TowerDefenseService) {}

  @Get("summary")
  getSummary(@CurrentUser() user: { sub: string }) {
    return this.towerDefenseService.getSummary(user.sub);
  }

  @Get("rankings")
  getRankings() {
    return this.towerDefenseService.getRankings();
  }

  @Post("start")
  startRun(@CurrentUser() user: { sub: string }) {
    return this.towerDefenseService.startRun(user.sub);
  }

  @Post("submit")
  submitResult(@CurrentUser() user: { sub: string }, @Body() body: { wavesCleared: number }) {
    return this.towerDefenseService.submitResult(user.sub, body.wavesCleared);
  }
}
