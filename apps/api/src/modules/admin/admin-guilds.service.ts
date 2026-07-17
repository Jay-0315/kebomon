import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 20;
// 소수 인원 길드에서 한 명이 보스 데미지 대부분을 담당하는 건 흔함(정예 소수 길드) — 어느 정도
// 인원이 있는 길드에서 유독 한 명에게 쏠릴 때만 이상치로 표시
const SUSPICIOUS_MIN_MEMBERS = 5;
const SUSPICIOUS_TOP_SHARE = 0.6;

@Injectable()
export class AdminGuildsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = q ? { name: { contains: q } } : undefined;

    const [guilds, total] = await Promise.all([
      this.prisma.guild.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true } },
          bossRuns: {
            orderBy: { weekKey: "desc" as const },
            take: 1,
            include: { contributions: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.guild.count({ where }),
    ]);

    const rows = guilds.map((g) => {
      const memberCount = g._count.members;
      const latestRun = g.bossRuns[0];
      let bossAnomaly: {
        weekKey: string;
        topContributorId: string;
        topDamage: number;
        totalDamage: number;
        topShare: number;
        suspicious: boolean;
      } | null = null;

      if (latestRun && latestRun.contributions.length > 0) {
        const totalDamage = latestRun.contributions.reduce((s, c) => s + c.damage, 0);
        const top = latestRun.contributions.reduce((a, b) => (b.damage > a.damage ? b : a));
        const topShare = totalDamage > 0 ? top.damage / totalDamage : 0;
        bossAnomaly = {
          weekKey: latestRun.weekKey,
          topContributorId: top.userId,
          topDamage: top.damage,
          totalDamage,
          topShare,
          suspicious: memberCount >= SUSPICIOUS_MIN_MEMBERS && topShare >= SUSPICIOUS_TOP_SHARE,
        };
      }

      return {
        id: g.id,
        name: g.name,
        level: g.level,
        memberCount,
        owner: g.owner,
        createdAt: g.createdAt,
        bossAnomaly,
      };
    });

    return { guilds: rows, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  }

  async disband(id: string) {
    const guild = await this.prisma.guild.findUnique({ where: { id } });
    if (!guild) throw new NotFoundException("길드를 찾을 수 없습니다.");
    // 길드원/가입신청/보스전/길드 게시글까지 전부 cascade 삭제됨 (schema.prisma onDelete: Cascade)
    await this.prisma.guild.delete({ where: { id } });
    return { id };
  }
}
