import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { logAdminAction } from "./admin-action-log.util";

@Injectable()
export class AdminTowerDefenseService {
  constructor(private readonly prisma: PrismaService) {}

  /** 최고 웨이브 기준 상위 100명 — 어뷰징 확인용이라 유저 페이지의 상위 20명보다 넓게 노출 */
  async getRankings() {
    const rows = await this.prisma.userReward.findMany({
      where: { tdBestWave: { gt: 0 } },
      orderBy: { tdBestWave: "desc" },
      take: 100,
      select: {
        userId: true,
        tdBestWave: true,
        tdAttemptsToday: true,
        tdAttemptDate: true,
        user: { select: { name: true, email: true } },
      },
    });
    return rows.map((r) => ({
      userId: r.userId,
      name: r.user?.name ?? "?",
      email: r.user?.email ?? "",
      tdBestWave: r.tdBestWave,
      tdAttemptsToday: r.tdAttemptsToday,
      tdAttemptDate: r.tdAttemptDate,
    }));
  }

  /** 어뷰징 확인 시 최고 기록을 0으로 초기화 — 랭킹에서 제외됨 */
  async resetBestWave(requesterId: string, targetUserId: string, reason?: string) {
    const reward = await this.prisma.userReward.findUnique({ where: { userId: targetUserId } });
    if (!reward) throw new NotFoundException("기록을 찾을 수 없습니다.");

    const prevWave = reward.tdBestWave;
    await this.prisma.userReward.update({
      where: { userId: targetUserId },
      data: { tdBestWave: 0 },
    });

    void logAdminAction(
      this.prisma,
      requesterId,
      "TOWER_DEFENSE_RESET",
      "USER",
      targetUserId,
      `${prevWave}웨이브 -> 0${reason ? ` (사유: ${reason})` : ""}`,
    );

    return { ok: true };
  }
}
