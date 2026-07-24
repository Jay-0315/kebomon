import { Injectable } from "@nestjs/common";
import { RewardsService } from "../rewards/rewards.service";
import { logAdminAction } from "./admin-action-log.util";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminSeasonService {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly prisma: PrismaService,
  ) {}

  async getPreview() {
    return this.rewardsService.getSeasonPreview();
  }

  async forceReset(requesterId: string) {
    const result = await this.rewardsService.forceEndCurrentSeason();
    void logAdminAction(
      this.prisma,
      requesterId,
      "SEASON_FORCE_RESET",
      null,
      null,
      `season ${result.seasonId}`,
    );
    return result;
  }
}
