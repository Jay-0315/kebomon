import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    if (await this.isOwnContent(reporterId, dto.targetType, dto.targetId)) {
      throw new BadRequestException("본인이 작성한 항목은 신고할 수 없습니다.");
    }

    try {
      return await this.prisma.report.create({
        data: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: dto.reason,
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        throw new BadRequestException("이미 신고한 항목입니다.");
      }
      throw err;
    }
  }

  private async isOwnContent(reporterId: string, targetType: string, targetId: string): Promise<boolean> {
    try {
      if (targetType === "USER") return targetId === reporterId;
      if (targetType === "POST") {
        const post = await this.prisma.communityPost.findUnique({ where: { id: targetId }, select: { userId: true } });
        return post?.userId === reporterId;
      }
      if (targetType === "COMMENT") {
        const comment = await this.prisma.comment.findUnique({ where: { id: BigInt(targetId) }, select: { userId: true } });
        return comment?.userId === reporterId;
      }
    } catch {
      // targetId 형식이 안 맞으면(예: 댓글인데 숫자가 아님) 본인 소유 여부를 판단할 수 없으므로
      // 차단하지 않고 통과시킨다 — 신고 자체는 생성되고 관리자 화면엔 "삭제됨"으로 표시된다.
      return false;
    }
    return false;
  }
}
