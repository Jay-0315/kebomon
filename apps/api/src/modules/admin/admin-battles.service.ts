import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 20;
// 어뷰징 의심 기준: 전적이 어느 정도 쌓였는데(표본 부족 방지) 승률이 비정상적으로 높은 경우
const SUSPICIOUS_MIN_GAMES = 15;
const SUSPICIOUS_WIN_RATE = 0.85;

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
    const rows = await this.prisma.battleStats.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const mapped = rows.map((r) => {
      const games = r.wins + r.losses;
      const winRate = games > 0 ? r.wins / games : 0;
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
        suspicious: games >= SUSPICIOUS_MIN_GAMES && winRate >= SUSPICIOUS_WIN_RATE,
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
