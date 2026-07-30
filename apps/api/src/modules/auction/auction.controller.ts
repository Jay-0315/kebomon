import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { AuctionService } from "./auction.service";

@UseGuards(JwtAuthGuard)
@Controller("auction")
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Get("listings")
  getListings(@Query("status") status?: string) {
    return this.auctionService.getListings(status || "active");
  }

  @Get("mine")
  getMyListings(@CurrentUser() user: { sub: string }) {
    return this.auctionService.getMyListings(user.sub);
  }

  @Get("history")
  getPriceHistory(@Query("characterId") characterId?: string) {
    return this.auctionService.getPriceHistory(characterId ? Number(characterId) : undefined);
  }

  @Post("list")
  listCharacter(
    @CurrentUser() user: { sub: string },
    @Body()
    body: { characterId: number; startPrice: number; buyoutPrice?: number; durationHours: number },
  ) {
    return this.auctionService.listCharacter(user.sub, body);
  }

  @Post(":id/bid")
  placeBid(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() body: { amount: number },
  ) {
    return this.auctionService.placeBid(user.sub, id, body.amount);
  }

  @Post(":id/buyout")
  buyout(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.auctionService.buyout(user.sub, id);
  }

  @Post(":id/cancel")
  cancelListing(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.auctionService.cancelListing(user.sub, id);
  }
}
