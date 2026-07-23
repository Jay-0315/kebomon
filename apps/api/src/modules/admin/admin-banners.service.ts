import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertBannerDto } from "./dto/upsert-banner.dto";

@Injectable()
export class AdminBannersService {
  private readonly logger = new Logger(AdminBannersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  }

  async create(dto: UpsertBannerDto) {
    return this.prisma.banner.create({ data: this.toData(dto) });
  }

  async update(id: string, dto: UpsertBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("배너를 찾을 수 없습니다.");
    return this.prisma.banner.update({ where: { id }, data: this.toData(dto) });
  }

  async remove(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("배너를 찾을 수 없습니다.");
    await this.prisma.banner.delete({ where: { id } });
    return { id };
  }

  // 매일 00:00 KST — 종료 시각이 지난 배너 자동 삭제
  @Cron("0 0 * * *", { timeZone: "Asia/Seoul" })
  async deleteExpiredBanners() {
    const { count } = await this.prisma.banner.deleteMany({
      where: { endsAt: { lt: new Date() } },
    });
    if (count > 0) this.logger.log(`기간 만료 배너 ${count}개 자동 삭제`);
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
