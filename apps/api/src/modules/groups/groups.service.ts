import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationGateway } from "../gateway/notification.gateway";
import { CreateGroupDto } from "./dto/create-group.dto";
import { HandleJoinRequestDto } from "./dto/handle-request.dto";
import { JoinByCodeDto } from "./dto/join-group.dto";
import { TransferHostDto } from "./dto/transfer-host.dto";

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const DEFAULT_TTL_DAYS = 7;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  private get memberInclude() {
    return {
      user: {
        select: {
          id: true,
          name: true,
          profilePhoto: true,
          reward: { select: { equippedCharacterId: true } },
        },
      },
    };
  }

  async getMyGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: { members: { include: this.memberInclude } },
        },
      },
    });

    return memberships.map(({ group }) => this.formatGroup(group, userId));
  }

  async createGroup(userId: string, dto: CreateGroupDto) {
    const ttlDays = dto.codeTtlDays ?? DEFAULT_TTL_DAYS;
    const codeExpiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateCode();
      const existing = await this.prisma.group.findUnique({ where: { inviteCode } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        inviteCode,
        hostUserId: userId,
        isPublic: dto.isPublic ?? false,
        codeExpiresAt,
        members: { create: { userId } },
      },
      include: {
        members: { include: this.memberInclude },
      },
    });

    return this.formatGroup(group, userId);
  }

  async searchPublicGroups(q?: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        isPublic: true,
        ...(q ? { name: { contains: q } } : {}),
      },
      include: {
        host: { select: { name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g._count.members,
      hostName: g.host.name,
    }));
  }

  async getGroupDetail(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: this.memberInclude },
      },
    });

    if (!group) throw new NotFoundException("그룹을 찾을 수 없습니다.");

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException("그룹 멤버가 아닙니다.");

    return this.formatGroup(group, userId);
  }

  async deleteGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("그룹을 찾을 수 없습니다.");
    if (group.hostUserId !== userId) throw new ForbiddenException("호스트만 그룹을 삭제할 수 있습니다.");

    await this.prisma.group.delete({ where: { id: groupId } });
    return { success: true };
  }

  async transferHost(groupId: string, userId: string, dto: TransferHostDto) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });
    if (!group) throw new NotFoundException("그룹을 찾을 수 없습니다.");
    if (group.hostUserId !== userId) throw new ForbiddenException("호스트만 양도할 수 있습니다.");

    const isMember = group.members.some((m: { userId: string }) => m.userId === dto.newHostId);
    if (!isMember) throw new BadRequestException("해당 사용자는 그룹 멤버가 아닙니다.");
    if (dto.newHostId === userId) throw new BadRequestException("본인에게 양도할 수 없습니다.");

    const updated = await this.prisma.group.update({
      where: { id: groupId },
      data: { hostUserId: dto.newHostId },
      include: { members: { include: { user: { select: { id: true, name: true } } } } },
    });

    return this.formatGroup(updated, userId);
  }

  async joinByCode(userId: string, dto: JoinByCodeDto) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode: dto.code },
      include: { members: true },
    });

    if (!group) throw new NotFoundException("유효하지 않은 초대 코드입니다.");

    if (group.codeExpiresAt && group.codeExpiresAt < new Date()) {
      throw new GoneException("만료된 초대 코드입니다.");
    }

    const alreadyMember = group.members.some((m) => m.userId === userId);
    if (alreadyMember) throw new ConflictException("이미 그룹 멤버입니다.");

    await this.prisma.groupMember.create({ data: { groupId: group.id, userId } });

    const updated = await this.prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: { include: this.memberInclude },
      },
    });

    return this.formatGroup(updated!, userId);
  }

  async sendJoinRequest(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new NotFoundException("그룹을 찾을 수 없습니다.");

    const alreadyMember = group.members.some((m) => m.userId === userId);
    if (alreadyMember) throw new ConflictException("이미 그룹 멤버입니다.");

    const existing = await this.prisma.groupJoinRequest.findFirst({
      where: { groupId, userId, status: "PENDING" },
    });
    if (existing) throw new ConflictException("이미 가입 요청을 보냈습니다.");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const request = await this.prisma.groupJoinRequest.create({ data: { groupId, userId } });

    this.gateway.emitToGroup(groupId, "group:joinRequest", {
      id: Number(request.id),
      groupId,
      userId,
      userName: user?.name ?? "사용자",
      createdAt: request.createdAt,
    });

    return { success: true };
  }

  async getPendingRequests(groupId: string, userId: string) {
    await this.assertHost(groupId, userId);

    const requests = await this.prisma.groupJoinRequest.findMany({
      where: { groupId, status: "PENDING" },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return requests.map((r) => ({ ...r, id: Number(r.id) }));
  }

  async handleRequest(groupId: string, reqId: bigint, userId: string, dto: HandleJoinRequestDto) {
    await this.assertHost(groupId, userId);

    const request = await this.prisma.groupJoinRequest.findUnique({ where: { id: reqId } });
    if (!request || request.groupId !== groupId) {
      throw new NotFoundException("가입 요청을 찾을 수 없습니다.");
    }
    if (request.status !== "PENDING") {
      throw new ConflictException("이미 처리된 요청입니다.");
    }

    await this.prisma.groupJoinRequest.update({
      where: { id: reqId },
      data: { status: dto.action },
    });

    if (dto.action === "APPROVED") {
      await this.prisma.groupMember.upsert({
        where: { groupId_userId: { groupId, userId: request.userId } },
        create: { groupId, userId: request.userId },
        update: {},
      });
    }

    this.gateway.emitToGroup(groupId, "group:requestHandled", {
      requestId: Number(reqId),
      action: dto.action,
    });

    return { success: true, action: dto.action };
  }

  async getGroupExpenses(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: { where: { userId } } },
    });
    if (!group) throw new NotFoundException("그룹을 찾을 수 없습니다.");
    if (group.members.length === 0) throw new ForbiddenException("그룹 멤버가 아닙니다.");

    return this.prisma.expense.findMany({
      where: { groupId },
      orderBy: { expenseDate: "desc" },
    });
  }

  async leaveGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("그룹을 찾을 수 없습니다.");

    if (group.hostUserId === userId) {
      throw new ForbiddenException("호스트는 그룹을 탈퇴할 수 없습니다. 그룹을 삭제하거나 호스트를 양도하세요.");
    }

    await this.prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    return { success: true };
  }

  // ── 헬퍼 ────────────────────────────────────────────────────

  private async assertHost(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException("그룹을 찾을 수 없습니다.");
    if (group.hostUserId !== userId) throw new ForbiddenException("호스트만 접근할 수 있습니다.");
  }

  private formatGroup(group: any, currentUserId: string) {
    return {
      id: group.id,
      name: group.name,
      code: group.inviteCode,
      isPublic: group.isPublic,
      codeExpiresAt: group.codeExpiresAt,
      isHost: group.hostUserId === currentUserId,
      members: group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        isHost: m.userId === group.hostUserId,
        equippedCharacterId: m.user.reward?.equippedCharacterId ?? null,
        profilePhoto: m.user.profilePhoto ?? null,
      })),
    };
  }
}
