import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ReplyInquiryDto } from "./dto/reply-inquiry.dto";

const PAGE_SIZE = 20;

@Injectable()
export class AdminInquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(status?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = status ? { status } : {};

    const [inquiries, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.inquiry.count({ where }),
    ]);

    return { inquiries, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  }

  async reply(requesterId: string, id: string, dto: ReplyInquiryDto) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException("문의를 찾을 수 없습니다.");

    const updated = await this.prisma.inquiry.update({
      where: { id },
      data: {
        adminReply: dto.reply,
        repliedBy: requesterId,
        repliedAt: new Date(),
        status: "ANSWERED",
      },
    });

    void this.notifications
      .create({
        userId: inquiry.userId,
        type: "notice",
        title: "문의에 답변이 등록되었습니다",
        body: dto.reply,
        titleJa: "お問い合わせに回答が登録されました",
        bodyJa: dto.reply,
        titleEn: "Your inquiry has been answered",
        bodyEn: dto.reply,
        link: "/settings",
      })
      .catch(() => undefined);

    return updated;
  }
}
