import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 20;
// 듀얼 어뷰징 의심 기준: 전적이 어느 정도 쌓였는데(표본 부족 방지) 승률이 비정상적으로 높은 경우
// (듀얼은 대전 상대가 기록되지 않아 콜로세움과 같은 특정 상대 타겟팅 탐지를 적용할 수 없음)
const SUSPICIOUS_MIN_GAMES = 15;
const SUSPICIOUS_WIN_RATE = 0.85;

// 콜로세움 어뷰징 의심 기준: 같은 상대를 반복 공격해서 점수를 쌓은 경우
// (예: 약한 부캐/지인 계정을 계속 공격해 티어 포인트를 파밍)
const SUSPICIOUS_TARGET_MIN_ATTACKS = 5; // 같은 상대를 최소 이만큼 공격해야 "반복"으로 간주
const SUSPICIOUS_TARGET_SHARE = 0.5; // 전체 공격 중 그 상대에게 쏠린 비중
const SUSPICIOUS_TARGET_POINTS = 3000; // 그 상대에게서만 얻은 누적 포인트 (실버 티어 기준선과 동일)

type SortKey = "winrate" | "tierpoints" | "streak";

@Injectable()
export class AdminBattlesService {
  constructor(private readonly prisma: PrismaService) {}

  private sortRows<T extends { wins: number; losses: number; winRate: number; bestStreak: number; tierPoints?: number }>(
    rows: T[],
    sort: SortKey,
  ) {
    return [...rows].sort((a, b) => {
      if (sort === "tierpoints") return (b.tierPoints ?? 0) - (a.tierPoints ?? 0);
      if (sort === "streak") return b.bestStreak - a.bestStreak;
      return b.winRate - a.winRate;
    });
  }

  private paginate<T>(rows: T[], page: number) {
    const total = rows.length;
    const start = (page - 1) * PAGE_SIZE;
    return {
      rows: rows.slice(start, start + PAGE_SIZE),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async listColosseum(sort: SortKey = "winrate", page = 1) {
    const [rows, targetGroups] = await Promise.all([
      this.prisma.battleStats.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.arenaAttackLog.groupBy({
        by: ["attackerId", "defenderId"],
        _sum: { pointsDelta: true },
        _count: { _all: true },
      }),
    ]);

    const byAttacker = new Map<string, { defenderId: string; attacks: number; points: number }[]>();
    for (const g of targetGroups) {
      const list = byAttacker.get(g.attackerId) ?? [];
      list.push({ defenderId: g.defenderId, attacks: g._count._all, points: g._sum.pointsDelta ?? 0 });
      byAttacker.set(g.attackerId, list);
    }

    const mapped = rows.map((r) => {
      const games = r.wins + r.losses;
      const winRate = games > 0 ? r.wins / games : 0;

      const targets = byAttacker.get(r.userId) ?? [];
      const totalAttacks = targets.reduce((s, x) => s + x.attacks, 0);
      const topTarget = targets.reduce(
        (a, b) => (b.points > a.points ? b : a),
        { defenderId: "", attacks: 0, points: -Infinity },
      );
      const targetFarming =
        totalAttacks > 0 &&
        topTarget.points >= SUSPICIOUS_TARGET_POINTS &&
        topTarget.attacks >= SUSPICIOUS_TARGET_MIN_ATTACKS &&
        topTarget.attacks / totalAttacks >= SUSPICIOUS_TARGET_SHARE;

      return {
        userId: r.userId,
        name: r.user.name,
        email: r.user.email,
        tierPoints: r.tierPoints,
        wins: r.wins,
        losses: r.losses,
        winStreak: r.winStreak,
        bestStreak: r.bestStreak,
        winRate,
        suspicious: targetFarming,
      };
    });

    return this.paginate(this.sortRows(mapped, sort), page);
  }

  async listDuel(sort: SortKey = "winrate", page = 1) {
    const rows = await this.prisma.duelStats.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const mapped = rows.map((r) => {
      const games = r.wins + r.losses;
      const winRate = games > 0 ? r.wins / games : 0;
      return {
        userId: r.userId,
        name: r.user.name,
        email: r.user.email,
        wins: r.wins,
        losses: r.losses,
        winStreak: r.winStreak,
        bestStreak: r.bestStreak,
        winRate,
        suspicious: games >= SUSPICIOUS_MIN_GAMES && winRate >= SUSPICIOUS_WIN_RATE,
      };
    });

    return this.paginate(this.sortRows(mapped, sort), page);
  }
}
