import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { cronWindowKey, runSingletonCron } from "../common/cron-lock.util";
import { apiError, badRequest } from "../common/api-error.util";
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
  // In-process guard for a single instance. Cross-instance locking is handled by job_executions.
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
      throw badRequest("AUCTION_INVALID_CHARACTER", "This character cannot be listed.");
    }
    if (!Number.isInteger(startPrice) || startPrice < MIN_START_PRICE) {
      throw badRequest("AUCTION_INVALID_START_PRICE", "Invalid start price.", { min: MIN_START_PRICE });
    }
    if (buyoutPrice !== undefined && buyoutPrice !== null) {
      if (!Number.isInteger(buyoutPrice) || buyoutPrice <= startPrice) {
        throw badRequest("AUCTION_INVALID_BUYOUT_PRICE", "Invalid buyout price.");
      }
    }
    if (!(ALLOWED_DURATIONS_HOURS as readonly number[]).includes(durationHours)) {
      throw badRequest("AUCTION_INVALID_DURATION", "Invalid auction duration.");
    }

    const owned = await this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
    if (!owned) {
      throw badRequest("AUCTION_CHARACTER_NOT_OWNED", "You do not own this character.");
    }

    const activeCount = await this.prisma.auctionListing.count({
      where: { sellerId: userId, status: "active" },
    });
    if (activeCount >= MAX_ACTIVE_LISTINGS_PER_USER) {
      throw badRequest("AUCTION_TOO_MANY_ACTIVE_LISTINGS", "Too many active listings.", { max: MAX_ACTIVE_LISTINGS_PER_USER });
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

  /** Recent sold listings used by the market price history view. */
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
      throw apiError("AUCTION_NOT_FOUND", "Auction listing not found.", HttpStatus.NOT_FOUND);
    }
    if (listing.sellerId === userId) {
      throw apiError("AUCTION_CANNOT_BID_OWN_LISTING", "Cannot bid on your own listing.", HttpStatus.FORBIDDEN);
    }
    const alreadyOwned = await this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId: listing.characterId } },
    });
    if (alreadyOwned) {
      throw badRequest("AUCTION_CHARACTER_ALREADY_OWNED", "You already own this character.");
    }
    const minBid = this.minNextBid(listing);
    if (!Number.isInteger(amount) || amount < minBid) {
      throw badRequest("AUCTION_BID_TOO_LOW", "Bid amount is too low.", { min: minBid });
    }
    const reward = await this.prisma.userReward.findUnique({ where: { userId } });
    if (!reward || reward.missionPoints < amount) {
      throw badRequest("AUCTION_NOT_ENOUGH_POINTS", "Not enough KP.");
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
        throw badRequest("AUCTION_BID_OUTDATED", "A higher bid already exists. Please retry.");
      }

      if (previousBidderId && previousBid !== null) {
        await tx.userReward.update({
          where: { userId: previousBidderId },
          data: { missionPoints: { increment: previousBid } },
        });
      }

      await tx.auctionBid.create({ data: { listingId, bidderId: userId, amount } });
    });

    void logPointsChange(this.prisma, userId, -amount, "auction_bid");
    if (previousBidderId && previousBid !== null) {
      void logPointsChange(this.prisma, previousBidderId, previousBid, "auction_bid_refund");
      void this.notifications
        .create({
          userId: previousBidderId,
          type: "auction",
          title: "Auction bid updated",
          body: `A higher bid was placed (${amount}KP).`,
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
      throw apiError("AUCTION_NOT_FOUND", "Auction listing not found.", HttpStatus.NOT_FOUND);
    }
    if (listing.buyoutPrice === null) {
      throw badRequest("AUCTION_BUYOUT_NOT_AVAILABLE", "Buyout is not available for this listing.");
    }
    await this.placeBid(userId, listingId, listing.buyoutPrice);
    return { ok: true };
  }

  async cancelListing(userId: string, listingId: string) {
    const listing = await this.prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== userId) {
      throw apiError("AUCTION_NOT_FOUND", "Auction listing not found.", HttpStatus.NOT_FOUND);
    }
    if (listing.status !== "active") {
      throw badRequest("AUCTION_LISTING_ALREADY_ENDED", "Auction listing is already ended.");
    }
    if (listing.currentBidderId !== null) {
      throw badRequest("AUCTION_LISTING_HAS_BID", "Cannot cancel a listing with bids.");
    }

    const updated = await this.prisma.auctionListing.updateMany({
      where: { id: listingId, status: "active" },
      data: { status: "cancelled", settledAt: new Date() },
    });
    if (updated.count === 0) {
      throw badRequest("AUCTION_LISTING_ALREADY_SETTLED", "Auction listing is already settled.");
    }

    await this.prisma.userCharacter.upsert({
      where: { userId_characterId: { userId, characterId: listing.characterId } },
      create: { userId, characterId: listing.characterId, enhancementLevel: listing.enhancementLevel },
      update: {},
    });

    return { ok: true };
  }

  /** Atomically settle one active listing into sold or expired. */
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
          title: "Auction expired",
          body: "No bids were placed, so the character was returned.",
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
      // If the winner already owns the character, refund the bid and return the listing to the seller.
      await this.prisma.userReward.update({
        where: { userId: winnerId },
        data: { missionPoints: { increment: bidAmount } },
      });
      void logPointsChange(this.prisma, winnerId, bidAmount, "auction_settle_refund");
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
    void logPointsChange(this.prisma, listing.sellerId, sellerPayout, "auction_seller_payout");

    void this.notifications
      .create({
        userId: listing.sellerId,
        type: "auction",
        title: "Auction sold",
        body: `+${sellerPayout}KP (10% fee applied)`,
        link: "/auction",
      })
      .catch(() => undefined);
    void this.notifications
      .create({
        userId: winnerId,
        type: "auction",
        title: "Auction won",
        body: "The character has been added to your collection.",
        link: "/kebomon",
      })
      .catch(() => undefined);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async settleExpiredAuctions() {
    return runSingletonCron(this.prisma, this.logger, "auction.settleExpiredAuctions", cronWindowKey(new Date(), "minute"), async () => {
      if (this.settlingAuctions) {
        this.logger.warn("Auction settlement is already running. Skipping this tick.");
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
            this.logger.error(`Failed to settle auction ${id}`, err),
          );
        }
      } catch (err) {
        this.logger.error("Failed to settle expired auctions", err);
      } finally {
        this.settlingAuctions = false;
      }
    });
  }
}
