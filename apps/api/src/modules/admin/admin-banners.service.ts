import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertBannerDto } from "./dto/upsert-banner.dto";
import { logAdminAction } from "./admin-action-log.util";

@Injectable()
export class AdminBannersService {
  private readonly logger = new Logger(AdminBannersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  }

  async create(requesterId: string, dto: UpsertBannerDto) {
    const created = await this.prisma.banner.create({ data: this.toData(dto) });
    void logAdminAction(this.prisma, requesterId, "BANNER_CREATE", "BANNER", created.id, dto.title);
    return created;
  }

  async update(requesterId: string, id: string, dto: UpsertBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("배너를 찾을 수 없습니다.");
    const updated = await this.prisma.banner.update({ where: { id }, data: this.toData(dto) });
    void logAdminAction(this.prisma, requesterId, "BANNER_UPDATE", "BANNER", id, dto.title);
    return updated;
  }

  async remove(requesterId: string, id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("배너를 찾을 수 없습니다.");
    await this.prisma.banner.delete({ where: { id } });
    void logAdminAction(this.prisma, requesterId, "BANNER_DELETE", "BANNER", id, banner.title);
    return { id };
  }

  // 매일 00:00 KST — 종료 시각이 지난 배너 자동 삭제 (deleteMany라 중복 실행돼도 안전)
  @Cron("0 0 * * *", { timeZone: "Asia/Seoul" })
  async deleteExpiredBanners() {
    try {
      const { count } = await this.prisma.banner.deleteMany({
        where: { endsAt: { lt: new Date() } },
      });
      if (count > 0) this.logger.log(`기간 만료 배너 ${count}개 자동 삭제`);
    } catch (err) {
      this.logger.error("만료 배너 자동 삭제 실패", err);
    }
  }

  private toData(dto: UpsertBannerDto) {
    return {
      title: dto.title,
      titleJa: dto.titleJa,
      titleEn: dto.titleEn,
      body: dto.body,
      bodyJa: dto.bodyJa,
      bodyEn: dto.bodyEn,
      imageUrl: dto.imageUrl,
      linkUrl: dto.linkUrl,
      active: dto.active,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      sortOrder: dto.sortOrder,
    };
  }
}
