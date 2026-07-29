import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { logPointsChange } from "../rewards/points-ledger.util";
import { getTodayKTC } from "../rewards/date.util";
import {
  FISH_CATCH_POINTS,
  FISH_DEX_MILESTONES,
  FISH_GRADE_WEIGHTS,
  FISH_ID_TO_RARITY,
  FISH_POOL_BY_RARITY,
  TOTAL_FISH_COUNT,
  pickWeightedRarity,
} from "./fish-master.constant";

const FISH_CAST_COOLDOWN_MS = 3000;

@Injectable()
export class FishingService {
  private static readonly DAILY_KP_CAP = 500;

  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateReward(userId: string) {
    return this.prisma.userReward.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async getSummary(userId: string) {
    const [reward, fish] = await Promise.all([
      this.getOrCreateReward(userId),
      this.prisma.userFish.findMany({
        where: { userId },
        select: { fishId: true, count: true },
      }),
    ]);

    const cooldownRemainingMs = reward.lastFishCastAt
      ? Math.max(0, FISH_CAST_COOLDOWN_MS - (Date.now() - reward.lastFishCastAt.getTime()))
      : 0;
    const dailyPointsEarned = reward.fishDailyDate === getTodayKTC() ? reward.fishDailyPoints : 0;

    return {
      ownedFish: Object.fromEntries(fish.map((f) => [f.fishId, f.count])),
      cooldownRemainingMs,
      fishDexMilestoneBest: reward.fishDexMilestoneBest,
      totalFishCount: TOTAL_FISH_COUNT,
      dailyPointsEarned,
      dailyPointsCap: FishingService.DAILY_KP_CAP,
    };
  }

  /** 캐스팅 시작 — 쿨다운 확인 후 타임스탬프 갱신 */
  async castLine(userId: string) {
    const reward = await this.getOrCreateReward(userId);
    const elapsed = reward.lastFishCastAt ? Date.now() - reward.lastFishCastAt.getTime() : Infinity;
    if (elapsed < FISH_CAST_COOLDOWN_MS) {
      throw new BadRequestException("아직 낚싯대를 던질 수 없습니다.");
    }
    await this.prisma.userReward.update({
      where: { userId },
      data: { lastFishCastAt: new Date() },
    });
    return { ok: true };
  }

  /** 낚시로 얻는 KP는 하루 DAILY_KP_CAP까지만 인정 — 남은 한도만큼만 실제 지급하고 나머지는 버림 */
  private async grantFishingPoints(userId: string, amount: number, reason: string): Promise<number> {
    if (amount <= 0) return 0;
    const today = getTodayKTC();
    const reward = await this.getOrCreateReward(userId);
    const baselineToday = reward.fishDailyDate === today ? reward.fishDailyPoints : 0;
    const granted = Math.max(0, Math.min(amount, FishingService.DAILY_KP_CAP - baselineToday));

    if (granted <= 0) {
      if (reward.fishDailyDate !== today) {
        await this.prisma.userReward.update({
          where: { userId },
          data: { fishDailyDate: today, fishDailyPoints: 0 },
        });
      }
      return 0;
    }

    await this.prisma.userReward.update({
      where: { userId },
      data: {
        missionPoints: { increment: granted },
        fishDailyPoints: baselineToday + granted,
        fishDailyDate: today,
      },
    });
    void logPointsChange(this.prisma, userId, granted, reason);
    return granted;
  }

  /** 타이밍 판정 결과(Perfect/Good)에 따라 물고기 등급을 서버가 추첨해 지급 */
  async resolveCatch(userId: string, grade: "perfect" | "good") {
    if (grade !== "perfect" && grade !== "good") {
      throw new BadRequestException("유효하지 않은 판정입니다.");
    }
    await this.getOrCreateReward(userId);

    const rarity = pickWeightedRarity(FISH_GRADE_WEIGHTS[grade]);
    const pool = FISH_POOL_BY_RARITY[rarity];
    const fishId = pool[Math.floor(Math.random() * pool.length)];

    const existing = await this.prisma.userFish.findUnique({
      where: { userId_fishId: { userId, fishId } },
    });
    const isNew = !existing;
    const basePoints = FISH_CATCH_POINTS[FISH_ID_TO_RARITY[fishId]];
    const wantedPoints = isNew ? basePoints : Math.ceil(basePoints / 2);

    const updatedFish = await this.prisma.userFish.upsert({
      where: { userId_fishId: { userId, fishId } },
      create: { userId, fishId },
      update: { count: { increment: 1 } },
    });
    const points = await this.grantFishingPoints(
      userId,
      wantedPoints,
      isNew ? "낚시 신규 포획" : "낚시 중복 포획",
    );

    const distinctCount = await this.prisma.userFish.count({ where: { userId } });
    const milestoneKp = await this.checkFishDexMilestones(userId, distinctCount);

    return {
      fishId,
      rarity,
      isNew,
      points,
      dailyCapReached: points < wantedPoints,
      totalCaught: updatedFish.count,
      distinctCount,
      milestoneKp,
    };
  }

  private async checkFishDexMilestones(userId: string, distinctCount: number): Promise<number> {
    const reward = await this.getOrCreateReward(userId);
    const crossed = FISH_DEX_MILESTONES.filter(
      (m) => m.count > reward.fishDexMilestoneBest && distinctCount >= m.count,
    );
    if (crossed.length === 0) return 0;

    const kp = crossed.reduce((sum, m) => sum + m.kp, 0);
    const newBest = Math.max(...crossed.map((m) => m.count));

    await this.prisma.userReward.update({
      where: { userId },
      data: { fishDexMilestoneBest: newBest },
    });

    return this.grantFishingPoints(userId, kp, "낚시 도감 마일스톤 보상");
  }
}
