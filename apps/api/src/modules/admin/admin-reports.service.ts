import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { UpdateReportStatusDto } from "./dto/update-report-status.dto";

const PAGE_SIZE = 20;

type Preview = { deleted: true } | Record<string, unknown>;

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(status?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = status ? { status } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        include: { reporter: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.report.count({ where }),
    ]);

    const previewByKey = await this.getPreviews(reports);
    const withPreview = reports.map((r) => ({
      ...r,
      preview: previewByKey.get(`${r.targetType}:${r.targetId}`) ?? ({ deleted: true } as Preview),
    }));

    return {
      reports: withPreview,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async updateStatus(requesterId: string, id: string, dto: UpdateReportStatusDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("신고 내역을 찾을 수 없습니다.");

    const updated = await this.prisma.report.update({
      where: { id },
      data: { status: dto.status, resolvedAt: new Date(), resolvedBy: requesterId },
    });

    const note = dto.resolutionNote?.trim();
    const body =
      dto.status === "RESOLVED"
        ? note
          ? `신고하신 내용이 처리되었습니다. (${note})`
          : "신고하신 내용이 처리되었습니다."
        : note
          ? `신고하신 내용을 검토했으나 조치 대상이 아니라고 판단되어 종료되었습니다. (${note})`
          : "신고하신 내용을 검토했으나 조치 대상이 아니라고 판단되어 종료되었습니다.";
    void this.notifications
      .create({ userId: report.reporterId, type: "notice", title: "신고 처리 결과", body })
      .catch(() => undefined);

    return updated;
  }

  /** targetType별로 묶어서 최대 3번의 배치 쿼리로 미리보기를 조회 (신고 건수만큼 N+1 쿼리 방지) */
  private async getPreviews(reports: { targetType: string; targetId: string }[]): Promise<Map<string, Preview>> {
    const postIds = reports.filter((r) => r.targetType === "POST").map((r) => r.targetId);
    const commentIds = reports
      .filter((r) => r.targetType === "COMMENT")
      .map((r) => {
        try {
          return BigInt(r.targetId);
        } catch {
          return null;
        }
      })
      .filter((id): id is bigint => id !== null);
    const userIds = reports.filter((r) => r.targetType === "USER").map((r) => r.targetId);

    const [posts, comments, users] = await Promise.all([
      postIds.length
        ? this.prisma.communityPost.findMany({ where: { id: { in: postIds } }, select: { id: true, content: true, category: true } })
        : Promise.resolve([]),
      commentIds.length
        ? this.prisma.comment.findMany({ where: { id: { in: commentIds } }, select: { id: true, content: true, postId: true } })
        : Promise.resolve([]),
      userIds.length
        ? this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, status: true } })
        : Promise.resolve([]),
    ]);

    const map = new Map<string, Preview>();
    for (const p of posts) map.set(`POST:${p.id}`, { content: p.content, category: p.category });
    for (const c of comments) map.set(`COMMENT:${c.id}`, { content: c.content, postId: c.postId });
    for (const u of users) map.set(`USER:${u.id}`, { name: u.name, email: u.email, status: u.status });
    return map;
  }
}
