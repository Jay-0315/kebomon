import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInquiryDto } from "./dto/create-inquiry.dto";

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateInquiryDto) {
    return this.prisma.inquiry.create({
      data: { userId, category: dto.category, content: dto.content },
    });
  }

  async findMine(userId: string) {
    return this.prisma.inquiry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
