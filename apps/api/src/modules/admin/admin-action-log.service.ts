import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { toCsv } from "./csv.util";

const PAGE_SIZE = 30;

@Injectable()
export class AdminActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actorId?: string, action?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.adminActionLog.count({ where }),
    ]);

    // actorId/targetId(USER)는 FK 없는 평문 컬럼이라(탈퇴 유저 기록도 남아야 함) 별도 조회로 이름을 붙인다.
    const userTargetIds = rows.filter((r) => r.targetType === "USER" && r.targetId).map((r) => r.targetId as string);
    const idsToResolve = [...new Set([...rows.map((r) => r.actorId), ...userTargetIds])];
    const users = idsToResolve.length
      ? await this.prisma.user.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    return {
      logs: rows.map((r) => ({
        ...r,
        id: r.id.toString(),
        actorName: nameById.get(r.actorId) ?? null,
        targetName: r.targetType === "USER" && r.targetId ? (nameById.get(r.targetId) ?? null) : null,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async exportCsv(actorId?: string, action?: string): Promise<string> {
    const where = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
    };

    const rows = await this.prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const userTargetIds = rows.filter((r) => r.targetType === "USER" && r.targetId).map((r) => r.targetId as string);
    const idsToResolve = [...new Set([...rows.map((r) => r.actorId), ...userTargetIds])];
    const users = idsToResolve.length
      ? await this.prisma.user.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    return toCsv(
      ["id", "actorId", "actorName", "action", "targetType", "targetId", "targetName", "detail", "createdAt"],
      rows.map((r) => [
        r.id.toString(),
        r.actorId,
        nameById.get(r.actorId) ?? null,
        r.action,
        r.targetType,
        r.targetId,
        r.targetType === "USER" && r.targetId ? (nameById.get(r.targetId) ?? null) : null,
        r.detail,
        r.createdAt.toISOString(),
      ]),
    );
  }
}
