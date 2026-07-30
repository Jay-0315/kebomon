import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { logPointsChange } from "../rewards/points-ledger.util";
import { logAdminAction } from "./admin-action-log.util";

const PAGE_SIZE = 20;

@Injectable()
export class AdminAuctionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(status?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = status ? { status } : {};
    const [listings, total] = await Promise.all([
      this.prisma.auctionListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          bidder: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auctionListing.count({ where }),
    ]);
    return { listings, total, page, totalPages: Math.ceil(total / PAGE_SIZE) };
  }

  /** 강제취소 — 입찰이 있었으면 입찰자에게 환불, 캐릭터는 판매자에게 반환 */
  async forceCancel(requesterId: string, listingId: string, reason?: string) {
    const listing = await this.prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException("경매를 찾을 수 없습니다.");
    if (listing.status !== "active") {
      throw new BadRequestException("이미 종료된 경매입니다.");
    }

    const claimed = await this.prisma.auctionListing.updateMany({
      where: { id: listingId, status: "active" },
      data: { status: "cancelled_by_admin" },
    });
    if (claimed.count === 0) {
      throw new BadRequestException("이미 처리된 경매입니다.");
    }

    if (listing.currentBidderId && listing.currentBid !== null) {
      await this.prisma.userReward.update({
        where: { userId: listing.currentBidderId },
        data: { missionPoints: { increment: listing.currentBid } },
      });
      void logPointsChange(this.prisma, listing.currentBidderId, listing.currentBid, "관리자 경매 강제취소 환불");
    }

    await this.prisma.userCharacter.upsert({
      where: { userId_characterId: { userId: listing.sellerId, characterId: listing.characterId } },
      create: {
        userId: listing.sellerId,
        characterId: listing.characterId,
        enhancementLevel: listing.enhancementLevel,
      },
      update: {},
    });

    void logAdminAction(
      this.prisma,
      requesterId,
      "AUCTION_FORCE_CANCEL",
      "AUCTION_LISTING",
      listingId,
      reason ?? null,
    );

    return { ok: true };
  }
}
