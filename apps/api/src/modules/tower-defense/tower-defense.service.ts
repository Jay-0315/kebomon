import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { logPointsChange } from "../rewards/points-ledger.util";
import { getTodayKTC } from "../rewards/date.util";
import { loadCharacterMasterMap } from "../rewards/character-master.util";
import {
  MAX_DAILY_ATTEMPTS,
  MIN_RUN_MS,
  OFFER_WEIGHTS,
  TD_MILESTONES,
  WAVE_COUNT,
  buildTowerPool,
} from "./tower-pool.constant";

@Injectable()
export class TowerDefenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getOrCreateReward(userId: string) {
    return this.prisma.userReward.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private attemptsUsedToday(reward: { tdAttemptDate: string | null; tdAttemptsToday: number }): number {
    return reward.tdAttemptDate === getTodayKTC() ? reward.tdAttemptsToday : 0;
  }

  async getSummary(userId: string) {
    const reward = await this.getOrCreateReward(userId);
    const masterMap = await loadCharacterMasterMap(this.prisma);
    const used = this.attemptsUsedToday(reward);

    return {
      attemptsLeft: Math.max(0, MAX_DAILY_ATTEMPTS - used),
      bestWave: reward.tdBestWave,
      towerPool: buildTowerPool(masterMap),
      offerWeights: OFFER_WEIGHTS,
      waveCount: WAVE_COUNT,
    };
  }

  async startRun(userId: string) {
    const reward = await this.getOrCreateReward(userId);
    const used = this.attemptsUsedToday(reward);
    if (used >= MAX_DAILY_ATTEMPTS) {
      throw new BadRequestException("오늘 도전 횟수를 모두 사용했습니다.");
    }

    await this.prisma.userReward.update({
      where: { userId },
      data: {
        tdAttemptsToday: used + 1,
        tdAttemptDate: getTodayKTC(),
        tdActiveRunStartedAt: new Date(),
      },
    });

    return { ok: true, attemptsLeft: MAX_DAILY_ATTEMPTS - (used + 1) };
  }

  async assertRunsAvailable(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)];
    const rewards = await Promise.all(uniqueIds.map((id) => this.getOrCreateReward(id)));
    const blocked = rewards.find((reward) => this.attemptsUsedToday(reward) >= MAX_DAILY_ATTEMPTS);
    if (blocked) {
      throw new BadRequestException("오늘 도전 횟수를 모두 사용한 참가자가 있습니다.");
    }
  }

  async consumeRuns(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)];
    const today = getTodayKTC();
    const rewards = await Promise.all(uniqueIds.map((id) => this.getOrCreateReward(id)));
    await this.prisma.$transaction(
      rewards.map((reward) =>
        this.prisma.userReward.update({
          where: { userId: reward.userId },
          data: {
            tdAttemptsToday: this.attemptsUsedToday(reward) + 1,
            tdAttemptDate: today,
            tdActiveRunStartedAt: new Date(),
          },
        }),
      ),
    );
  }

  async submitResult(userId: string, wavesCleared: number) {
    const reward = await this.getOrCreateReward(userId);
    if (!reward.tdActiveRunStartedAt) {
      throw new BadRequestException("시작되지 않은 게임입니다.");
    }
    const elapsed = Date.now() - reward.tdActiveRunStartedAt.getTime();
    if (elapsed < MIN_RUN_MS) {
      throw new BadRequestException("비정상적으로 빠른 진행입니다.");
    }

    const clampedWave = Math.max(0, Math.min(WAVE_COUNT, Math.floor(wavesCleared)));
    const prevBest = reward.tdBestWave;
    const isNewRecord = clampedWave > prevBest;

    const crossed = TD_MILESTONES.filter((m) => m.wave > prevBest && clampedWave >= m.wave);
    const kp = crossed.reduce((sum, m) => sum + m.kp, 0);

    await this.prisma.userReward.update({
      where: { userId },
      data: {
        tdActiveRunStartedAt: null,
        ...(isNewRecord ? { tdBestWave: clampedWave } : {}),
        ...(kp > 0 ? { missionPoints: { increment: kp } } : {}),
      },
    });

    if (kp > 0) {
      void logPointsChange(this.prisma, userId, kp, "타워 디펜스 웨이브 마일스톤 보상");
    }
    if (isNewRecord) {
      void this.notifications
        .create({
          userId,
          type: "achievement",
          title: "타워 디펜스 신기록!",
          body: `${clampedWave}웨이브까지 도달했습니다.`,
          link: "/tower-defense",
        })
        .catch(() => undefined);
    }

    return {
      wavesCleared: clampedWave,
      isNewRecord,
      bestWave: Math.max(prevBest, clampedWave),
      kpEarned: kp,
    };
  }

  async submitServerResult(userId: string, wavesCleared: number) {
    return this.applyResult(userId, wavesCleared, true);
  }

  private async applyResult(userId: string, wavesCleared: number, clearActiveRun: boolean) {
    const reward = await this.getOrCreateReward(userId);
    const clampedWave = Math.max(0, Math.min(WAVE_COUNT, Math.floor(wavesCleared)));
    const prevBest = reward.tdBestWave;
    const isNewRecord = clampedWave > prevBest;
    const crossed = TD_MILESTONES.filter((m) => m.wave > prevBest && clampedWave >= m.wave);
    const kp = crossed.reduce((sum, m) => sum + m.kp, 0);

    await this.prisma.userReward.update({
      where: { userId },
      data: {
        ...(clearActiveRun ? { tdActiveRunStartedAt: null } : {}),
        ...(isNewRecord ? { tdBestWave: clampedWave } : {}),
        ...(kp > 0 ? { missionPoints: { increment: kp } } : {}),
      },
    });

    if (kp > 0) {
      void logPointsChange(this.prisma, userId, kp, "타워 디펜스 웨이브 마일스톤 보상");
    }
    if (isNewRecord) {
      void this.notifications
        .create({
          userId,
          type: "achievement",
          title: "타워 디펜스 신기록!",
          body: `${clampedWave}웨이브까지 도달했습니다.`,
          link: "/tower-defense",
        })
        .catch(() => undefined);
    }

    return {
      wavesCleared: clampedWave,
      isNewRecord,
      bestWave: Math.max(prevBest, clampedWave),
      kpEarned: kp,
    };
  }

  /** 최고 웨이브 기준 상위 20명 — challenge-rankings(rewards.service.ts)와 동일 패턴 */
  async getRankings() {
    const rows = await this.prisma.userReward.findMany({
      where: { tdBestWave: { gt: 0 } },
      take: 20,
      orderBy: { tdBestWave: "desc" },
      select: {
        userId: true,
        tdBestWave: true,
        equippedCharacterId: true,
        user: { select: { name: true } },
      },
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      nickname: r.user?.name ?? "???",
      bestWave: r.tdBestWave,
      characterId: r.equippedCharacterId ?? null,
    }));
  }
}
