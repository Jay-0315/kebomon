import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { cronWindowKey, runSingletonCron } from "../common/cron-lock.util";
import { logPointsChange } from "../rewards/points-ledger.util";
import { GACHA_POOL_IDS } from "../rewards/rewards.service";

const MAX_ACTIVE_LISTINGS_PER_USER = 5;
const FEE_RATE = 0.1;
const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000;
const ANTI_SNIPE_EXTEND_MS = 2 * 60 * 1000;
const ALLOWED_DURATIONS_HOURS = [6, 12, 24, 48] as const;
const MIN_START_PRICE = 10;

@Injectable()
export class AuctionService {
  private readonly logger = new Logger(AuctionService.name);
  // 정산이 1분(크론 주기)보다 오래 걸리면 다음 tick이 겹쳐 들어올 수 있어 재진입 방지
  private settlingAuctions = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listCharacter(
    userId: string,
    input: { characterId: number; startPrice: number; buyoutPrice?: number; durationHours: number },
  ) {
    const { characterId, startPrice, buyoutPrice, durationHours } = input;

    if (!GACHA_POOL_IDS.includes(characterId)) {
      throw new BadRequestException("경매에 등록할 수 없는 케보몬입니다.");
    }
    if (!Number.isInteger(startPrice) || startPrice < MIN_START_PRICE) {
      throw new BadRequestException(`시작가는 ${MIN_START_PRICE}KP 이상이어야 합니다.`);
    }
    if (buyoutPrice !== undefined && buyoutPrice !== null) {
      if (!Number.isInteger(buyoutPrice) || buyoutPrice <= startPrice) {
        throw new BadRequestException("즉시구매가는 시작가보다 커야 합니다.");
      }
    }
    if (!(ALLOWED_DURATIONS_HOURS as readonly number[]).includes(durationHours)) {
      throw new BadRequestException("유효하지 않은 경매 기간입니다.");
    }

    const owned = await this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
    if (!owned) {
      throw new BadRequestException("해당 케보몬을 보유하고 있지 않습니다.");
    }

    const activeCount = await this.prisma.auctionListing.count({
      where: { sellerId: userId, status: "active" },
    });
    if (activeCount >= MAX_ACTIVE_LISTINGS_PER_USER) {
      throw new BadRequestException(`동시 등록 가능한 경매는 최대 ${MAX_ACTIVE_LISTINGS_PER_USER}개입니다.`);
    }

    const reward = await this.prisma.userReward.findUnique({ where: { userId } });
    const endsAt = new Date(Date.now() + durationHours * 3600_000);

    const [listing] = await this.prisma.$transaction([
      this.prisma.auctionListing.create({
        data: {
          sellerId: userId,
          characterId,
          enhancementLevel: owned.enhancementLevel,
          startPrice,
          buyoutPrice: buyoutPrice ?? null,
          endsAt,
        },
      }),
      this.prisma.userCharacter.delete({ where: { userId_characterId: { userId, characterId } } }),
      ...(reward?.equippedCharacterId === characterId
        ? [this.prisma.userReward.update({ where: { userId }, data: { equippedCharacterId: null } })]
        : []),
    ]);

    return listing;
  }

  async getListings(status: string = "active") {
    return this.prisma.auctionListing.findMany({
      where: { status },
      orderBy: { endsAt: "asc" },
      take: 100,
    });
  }

  async getMyListings(userId: string) {
    const [selling, bidding] = await Promise.all([
      this.prisma.auctionListing.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.auctionListing.findMany({
        where: { currentBidderId: userId },
        orderBy: { endsAt: "asc" },
        take: 50,
      }),
    ]);
    return { selling, bidding };
  }

  /** 시세 확인용 — 최근 낙찰 내역 (등급/캐릭터 무관하게 최신순, 필요시 캐릭터로 필터) */
  async getPriceHistory(characterId?: number) {
    return this.prisma.auctionListing.findMany({
      where: { status: "sold", ...(characterId ? { characterId } : {}) },
      orderBy: { settledAt: "desc" },
      take: 100,
      select: {
        id: true,
        characterId: true,
        enhancementLevel: true,
        currentBid: true,
        settledAt: true,
      },
    });
  }

  private minNextBid(listing: { startPrice: number; currentBid: number | null }): number {
    if (listing.currentBid === null) return listing.startPrice;
    return listing.currentBid + Math.max(Math.ceil(listing.currentBid * 0.05), 10);
  }

  async placeBid(userId: string, listingId: string, amount: number) {
    const listing = await this.prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "active") {
      throw new NotFoundException("진행 중인 경매를 찾을 수 없습니다.");
    }
    if (listing.sellerId === userId) {
      throw new ForbiddenException("자신의 경매에는 입찰할 수 없습니다.");
    }
    const alreadyOwned = await this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId: listing.characterId } },
    });
    if (alreadyOwned) {
      throw new BadRequestException("이미 보유하고 있는 케보몬입니다.");
    }
    const minBid = this.minNextBid(listing);
    if (!Number.isInteger(amount) || amount < minBid) {
      throw new BadRequestException(`최소 입찰액은 ${minBid}KP입니다.`);
    }
    const reward = await this.prisma.userReward.findUnique({ where: { userId } });
    if (!reward || reward.missionPoints < amount) {
      throw new BadRequestException("KP가 부족합니다.");
    }

    const previousBidderId = listing.currentBidderId;
    const previousBid = listing.currentBid;
    const extend = listing.endsAt.getTime() - Date.now() <= ANTI_SNIPE_WINDOW_MS;
    const newEndsAt = extend ? new Date(Date.now() + ANTI_SNIPE_EXTEND_MS) : listing.endsAt;

    await this.prisma.$transaction(async (tx) => {
      await tx.userReward.update({
        where: { userId },
        data: { missionPoints: { decrement: amount } },
      });

      const updated = await tx.auctionListing.updateMany({
        where: {
          id: listingId,
          status: "active",
          OR: [{ currentBid: null }, { currentBid: { lt: amount } }],
        },
        data: { currentBid: amount, currentBidderId: userId, endsAt: newEndsAt },
      });
      if (updated.count === 0) {
        throw new BadRequestException("이미 더 높은 입찰이 들어왔습니다. 다시 시도해주세요.");
      }

      if (previousBidderId && previousBid !== null) {
        await tx.userReward.update({
          where: { userId: previousBidderId },
          data: { missionPoints: { increment: previousBid } },
        });
      }

      await tx.auctionBid.create({ data: { listingId, bidderId: userId, amount } });
    });

    void logPointsChange(this.prisma, userId, -amount, "경매 입찰");
    if (previousBidderId && previousBid !== null) {
      void logPointsChange(this.prisma, previousBidderId, previousBid, "경매 아웃비드 환불");
      void this.notifications
        .create({
          userId: previousBidderId,
          type: "auction",
          title: "입찰가가 갱신됐어요",
          body: `다른 유저가 더 높은 금액(${amount}KP)에 입찰했습니다.`,
          link: "/auction",
        })
        .catch(() => undefined);
    }

    if (listing.buyoutPrice !== null && amount >= listing.buyoutPrice) {
      await this.settleListing(listingId);
    }

    return { ok: true };
  }

  async buyout(userId: string, listingId: string) {
    const listing = await this.prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "active") {
      throw new NotFoundException("진행 중인 경매를 찾을 수 없습니다.");
    }
    if (listing.buyoutPrice === null) {
      throw new BadRequestException("즉시구매가 설정되지 않은 경매입니다.");
    }
    await this.placeBid(userId, listingId, listing.buyoutPrice);
    return { ok: true };
  }

  async cancelListing(userId: string, listingId: string) {
    const listing = await this.prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== userId) {
      throw new NotFoundException("경매를 찾을 수 없습니다.");
    }
    if (listing.status !== "active") {
      throw new BadRequestException("이미 종료된 경매입니다.");
    }
    if (listing.currentBidderId !== null) {
      throw new BadRequestException("입찰이 있는 경매는 취소할 수 없습니다.");
    }

    const updated = await this.prisma.auctionListing.updateMany({
      where: { id: listingId, status: "active" },
      data: { status: "cancelled", settledAt: new Date() },
    });
    if (updated.count === 0) {
      throw new BadRequestException("이미 처리된 경매입니다.");
    }

    await this.prisma.userCharacter.upsert({
      where: { userId_characterId: { userId, characterId: listing.characterId } },
      create: { userId, characterId: listing.characterId, enhancementLevel: listing.enhancementLevel },
      update: {},
    });

    return { ok: true };
  }

  /** active -> sold/expired 조건부 전환 후 정산 — 중복 정산 방지 */
  async settleListing(listingId: string) {
    const listing = await this.prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== "active") return;

    const finalStatus = listing.currentBidderId ? "sold" : "expired";
    const claimed = await this.prisma.auctionListing.updateMany({
      where: { id: listingId, status: "active" },
      data: { status: finalStatus, settledAt: new Date() },
    });
    if (claimed.count === 0) return;

    if (!listing.currentBidderId || listing.currentBid === null) {
      await this.prisma.userCharacter.upsert({
        where: { userId_characterId: { userId: listing.sellerId, characterId: listing.characterId } },
        create: {
          userId: listing.sellerId,
          characterId: listing.characterId,
          enhancementLevel: listing.enhancementLevel,
        },
        update: {},
      });
      void this.notifications
        .create({
          userId: listing.sellerId,
          type: "auction",
          title: "경매가 유찰됐어요",
          body: "입찰자가 없어 케보몬이 반환됐습니다.",
          link: "/auction",
        })
        .catch(() => undefined);
      return;
    }

    const winnerId = listing.currentBidderId;
    const bidAmount = listing.currentBid;

    try {
      await this.prisma.userCharacter.create({
        data: { userId: winnerId, characterId: listing.characterId, enhancementLevel: listing.enhancementLevel },
      });
    } catch {
      // 낙찰자가 그 사이 같은 캐릭터를 다른 경로로 얻은 방어적 예외 케이스 — 전액 환불하고 판매자에게 반환
      await this.prisma.userReward.update({
        where: { userId: winnerId },
        data: { missionPoints: { increment: bidAmount } },
      });
      void logPointsChange(this.prisma, winnerId, bidAmount, "경매 낙찰 실패 환불");
      await this.prisma.userCharacter.upsert({
        where: { userId_characterId: { userId: listing.sellerId, characterId: listing.characterId } },
        create: {
          userId: listing.sellerId,
          characterId: listing.characterId,
          enhancementLevel: listing.enhancementLevel,
        },
        update: {},
      });
      return;
    }

    const sellerPayout = Math.floor(bidAmount * (1 - FEE_RATE));
    await this.prisma.userReward.update({
      where: { userId: listing.sellerId },
      data: { missionPoints: { increment: sellerPayout } },
    });
    void logPointsChange(this.prisma, listing.sellerId, sellerPayout, "경매 판매 대금");

    void this.notifications
      .create({
        userId: listing.sellerId,
        type: "auction",
        title: "케보몬이 낙찰됐어요",
        body: `+${sellerPayout}KP (수수료 10% 차감)`,
        link: "/auction",
      })
      .catch(() => undefined);
    void this.notifications
      .create({
        userId: winnerId,
        type: "auction",
        title: "경매에 낙찰됐어요",
        body: "케보몬을 획득했습니다. 도감에서 확인해보세요.",
        link: "/kebomon",
      })
      .catch(() => undefined);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async settleExpiredAuctions() {
    return runSingletonCron(this.prisma, this.logger, "auction.settleExpiredAuctions", cronWindowKey(new Date(), "minute"), async () => {
      if (this.settlingAuctions) {
        this.logger.warn("이전 경매 정산이 아직 진행 중 — 이번 tick은 건너뜀");
        return;
      }
      this.settlingAuctions = true;
      try {
        const expired = await this.prisma.auctionListing.findMany({
          where: { status: "active", endsAt: { lte: new Date() } },
          select: { id: true },
        });
        for (const { id } of expired) {
          await this.settleListing(id).catch((err) =>
            this.logger.error(`경매 ${id} 정산 실패`, err),
          );
        }
      } catch (err) {
        this.logger.error("경매 만료 정산 배치 실패", err);
      } finally {
        this.settlingAuctions = false;
      }
    });
  }
}
