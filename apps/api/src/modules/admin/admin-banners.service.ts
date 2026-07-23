import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertBannerDto } from "./dto/upsert-banner.dto";

@Injectable()
export class AdminBannersService {
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

  private toData(dto: UpsertBannerDto) {
    return {
      title: dto.title,
      titleJa: dto.titleJa,
      titleEn: dto.titleEn,
      body: dto.body,
      bodyJa: dto.bodyJa,
      bodyEn: dto.bodyEn,
      linkUrl: dto.linkUrl,
      active: dto.active,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      sortOrder: dto.sortOrder,
    };
  }
}
