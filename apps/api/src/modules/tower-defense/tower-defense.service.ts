import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { logPointsChange } from "../rewards/points-ledger.util";
import { getTodayKTC } from "../rewards/date.util";
import { loadCharacterMasterMap } from "../rewards/character-master.util";
import { badRequest } from "../common/api-error.util";
import {
  MIN_RUN_MS,
  OFFER_WEIGHTS,
  TD_MILESTONES,
  WAVE_COUNT,
  buildTowerPool,
} from "./tower-pool.constant";

const TD_DAILY_KP_CAP = 1200;
const TD_RUN_KP_CAP = 400;
const TD_KP_LEDGER_REASON = "tower_defense_reward";
const MAX_DAILY_ATTEMPTS = Number.MAX_SAFE_INTEGER;

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

  private todayRangeKtc(now = Date.now()) {
    // KP cap is evaluated at reward grant time, so runs that end after midnight use the new day's cap.
    const today = new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
    const start = new Date(`${today}T00:00:00+09:00`);
    return { start, end: new Date(start.getTime() + 86_400_000) };
  }

  private async towerDefenseKpGrantedToday(userId: string) {
    const { start, end } = this.todayRangeKtc();
    const result = await this.prisma.pointsLedger.aggregate({
      where: {
        userId,
        reason: TD_KP_LEDGER_REASON,
        delta: { gt: 0 },
        createdAt: { gte: start, lt: end },
      },
      _sum: { delta: true },
    });
    return result._sum.delta ?? 0;
  }

  private rawRunKp(wavesCleared: number) {
    return TD_MILESTONES.filter((m) => wavesCleared >= m.wave).reduce((sum, m) => sum + m.kp, 0);
  }

  private async grantTowerDefenseKp(userId: string, wantedKp: number) {
    const todayGranted = await this.towerDefenseKpGrantedToday(userId);
    const dailyLeft = Math.max(0, TD_DAILY_KP_CAP - todayGranted);
    const granted = Math.max(0, Math.min(wantedKp, TD_RUN_KP_CAP, dailyLeft));
    return {
      granted,
      wanted: wantedKp,
      dailyKpCap: TD_DAILY_KP_CAP,
      dailyKpEarned: todayGranted + granted,
      dailyKpLeft: Math.max(0, TD_DAILY_KP_CAP - todayGranted - granted),
      perRunKpCap: TD_RUN_KP_CAP,
    };
  }

  async getSummary(userId: string) {
    const reward = await this.getOrCreateReward(userId);
    const masterMap = await loadCharacterMasterMap(this.prisma);
    const dailyKpEarned = await this.towerDefenseKpGrantedToday(userId);

    return {
      attemptsLeft: null,
      playMode: "unlimited",
      bestWave: reward.tdBestWave,
      dailyKpCap: TD_DAILY_KP_CAP,
      dailyKpEarned,
      dailyKpLeft: Math.max(0, TD_DAILY_KP_CAP - dailyKpEarned),
      perRunKpCap: TD_RUN_KP_CAP,
      towerPool: buildTowerPool(masterMap),
      offerWeights: OFFER_WEIGHTS,
      waveCount: WAVE_COUNT,
    };
  }

  async startRun(userId: string) {
    await this.getOrCreateReward(userId);
    await this.prisma.userReward.update({
      where: { userId },
      data: { tdActiveRunStartedAt: new Date() },
    });
    return { ok: true, playMode: "unlimited" };
    const reward = await this.getOrCreateReward(userId);
    const used = this.attemptsUsedToday(reward);
    if (used >= MAX_DAILY_ATTEMPTS) {
      throw badRequest("TD_RUN_LIMIT_EXCEEDED", "・､・・・・・巐滕・・ｼ ・ｨ・・・ｬ・ｩ嵂溢慣・壱共.");
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
      throw badRequest("TD_RUN_LIMIT_EXCEEDED", "・､・・・・・巐滕・・ｼ ・ｨ・・・ｬ・ｩ﨑・・ｸ・・専ｰ ・溢慣・壱共.");
    }
  }

  async consumeRuns(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)];
    await Promise.all(uniqueIds.map((id) => this.getOrCreateReward(id)));
    await this.prisma.$transaction(
      uniqueIds.map((userId) =>
        this.prisma.userReward.update({
          where: { userId },
          data: { tdActiveRunStartedAt: new Date() },
        }),
      ),
    );
    return;
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
      throw badRequest("TD_RUN_NOT_STARTED", "・懍梠・們ｧ ・喜捩 ・護桷・・笈・､.");
    }
    const elapsed = Date.now() - reward.tdActiveRunStartedAt.getTime();
    if (elapsed < MIN_RUN_MS) {
      throw badRequest("TD_RUN_TOO_FAST", "・・菩メ・・愍・・・・ｸ ・・哩・・笈・､.");
    }

    const clampedWave = Math.max(0, Math.min(WAVE_COUNT, Math.floor(wavesCleared)));
    const prevBest = reward.tdBestWave;
    const isNewRecord = clampedWave > prevBest;

    const kpGrant = await this.grantTowerDefenseKp(userId, this.rawRunKp(clampedWave));
    const kp = kpGrant.granted;

    await this.prisma.userReward.update({
      where: { userId },
      data: {
        tdActiveRunStartedAt: null,
        ...(isNewRecord ? { tdBestWave: clampedWave } : {}),
        ...(kp > 0 ? { missionPoints: { increment: kp } } : {}),
      },
    });

    if (kp > 0) {
      void logPointsChange(this.prisma, userId, kp, TD_KP_LEDGER_REASON, {
        source: "tower-defense",
        sourceId: `wave:${clampedWave}`,
        idempotencyKey: `tower-defense:client:${userId}:${reward.tdActiveRunStartedAt.getTime()}`,
      });
    }
    if (isNewRecord) {
      void this.notifications
        .create({
          userId,
          type: "achievement",
          title: "夋・・・被慈・､ ・・ｰ・・",
          body: `${clampedWave}・ｨ・ｴ・語ｹ護ｧ ・・峡嵂溢慣・壱共.`,
          link: "/tower-defense",
        })
        .catch(() => undefined);
    }

    return {
      wavesCleared: clampedWave,
      isNewRecord,
      bestWave: Math.max(prevBest, clampedWave),
      kpEarned: kp,
      kpWanted: kpGrant.wanted,
      dailyKpCap: kpGrant.dailyKpCap,
      dailyKpEarned: kpGrant.dailyKpEarned,
      dailyKpLeft: kpGrant.dailyKpLeft,
      perRunKpCap: kpGrant.perRunKpCap,
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
    const kpGrant = await this.grantTowerDefenseKp(userId, this.rawRunKp(clampedWave));
    const kp = kpGrant.granted;

    await this.prisma.userReward.update({
      where: { userId },
      data: {
        ...(clearActiveRun ? { tdActiveRunStartedAt: null } : {}),
        ...(isNewRecord ? { tdBestWave: clampedWave } : {}),
        ...(kp > 0 ? { missionPoints: { increment: kp } } : {}),
      },
    });

    if (kp > 0) {
      void logPointsChange(this.prisma, userId, kp, TD_KP_LEDGER_REASON, {
        source: "tower-defense",
        sourceId: `wave:${clampedWave}`,
        idempotencyKey: `tower-defense:server:${userId}:${reward.tdActiveRunStartedAt?.getTime() ?? Date.now()}`,
      });
    }
    if (isNewRecord) {
      void this.notifications
        .create({
          userId,
          type: "achievement",
          title: "夋・・・被慈・､ ・・ｰ・・",
          body: `${clampedWave}・ｨ・ｴ・語ｹ護ｧ ・・峡嵂溢慣・壱共.`,
          link: "/tower-defense",
        })
        .catch(() => undefined);
    }

    return {
      wavesCleared: clampedWave,
      isNewRecord,
      bestWave: Math.max(prevBest, clampedWave),
      kpEarned: kp,
      kpWanted: kpGrant.wanted,
      dailyKpCap: kpGrant.dailyKpCap,
      dailyKpEarned: kpGrant.dailyKpEarned,
      dailyKpLeft: kpGrant.dailyKpLeft,
      perRunKpCap: kpGrant.perRunKpCap,
    };
  }

  /** ・懋ｳ ・ｨ・ｴ・・・ｰ・ ・・怱 20・・窶・challenge-rankings(rewards.service.ts)・ ・呷攵 甯ｨ奓ｴ */
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
