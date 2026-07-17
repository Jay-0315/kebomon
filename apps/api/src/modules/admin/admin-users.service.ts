import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdjustUserRewardDto } from "./dto/adjust-user-reward.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

const PAGE_SIZE = 20;

const rewardSelect = {
  missionPoints: true,
  normalEggs: true,
  bigEggs: true,
  goldenEggs: true,
  enhancementStones: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q?: string, role?: string, status?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          suspendedReason: true,
          createdAt: true,
          lastLoginAt: true,
          reward: { select: rewardSelect },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedReason: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
    return user;
  }

  async updateRole(requesterId: string, targetId: string, dto: UpdateUserRoleDto) {
    if (requesterId === targetId) {
      throw new ForbiddenException("본인 계정의 권한은 변경할 수 없습니다.");
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    return updated;
  }

  async updateStatus(requesterId: string, targetId: string, dto: UpdateUserStatusDto) {
    if (requesterId === targetId) {
      throw new ForbiddenException("본인 계정은 정지할 수 없습니다.");
    }
    if (dto.status === "SUSPENDED" && !dto.reason) {
      throw new BadRequestException("정지 사유를 입력해주세요.");
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: {
        status: dto.status,
        suspendedReason: dto.status === "SUSPENDED" ? dto.reason : null,
      },
      select: { id: true, name: true, email: true, role: true, status: true, suspendedReason: true },
    });
    return updated;
  }

  async adjustReward(requesterId: string, targetId: string, dto: AdjustUserRewardDto) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    const current = await this.prisma.userReward.findUnique({ where: { userId: targetId } });
    const clamp = (base: number, delta?: number) => Math.max(0, base + (delta ?? 0));

    const next = {
      missionPoints: clamp(current?.missionPoints ?? 0, dto.missionPointsDelta),
      normalEggs: clamp(current?.normalEggs ?? 0, dto.normalEggsDelta),
      bigEggs: clamp(current?.bigEggs ?? 0, dto.bigEggsDelta),
      goldenEggs: clamp(current?.goldenEggs ?? 0, dto.goldenEggsDelta),
      enhancementStones: clamp(current?.enhancementStones ?? 0, dto.enhancementStonesDelta),
    };

    const updated = await this.prisma.userReward.upsert({
      where: { userId: targetId },
      create: { userId: targetId, ...next },
      update: next,
      select: rewardSelect,
    });

    console.log(
      `[admin] ${requesterId} adjusted reward for ${targetId}${dto.reason ? ` (${dto.reason})` : ""}:`,
      dto,
    );

    return updated;
  }
}
