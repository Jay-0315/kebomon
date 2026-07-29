import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { FishingService } from "./fishing.service";

@UseGuards(JwtAuthGuard)
@Controller("fishing")
export class FishingController {
  constructor(private readonly fishingService: FishingService) {}

  @Get("summary")
  getSummary(@CurrentUser() user: { sub: string }) {
    return this.fishingService.getSummary(user.sub);
  }

  @Post("cast")
  castLine(@CurrentUser() user: { sub: string }) {
    return this.fishingService.castLine(user.sub);
  }

  @Post("catch")
  resolveCatch(@CurrentUser() user: { sub: string }, @Body() body: { grade: "perfect" | "good" }) {
    return this.fishingService.resolveCatch(user.sub, body.grade);
  }
}
