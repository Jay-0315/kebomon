import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminAuctionService } from "./admin-auction.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/auction")
export class AdminAuctionController {
  constructor(private readonly adminAuctionService: AdminAuctionService) {}

  @Get("listings")
  findAll(@Query("status") status?: string, @Query("page") page?: string) {
    return this.adminAuctionService.findAll(status, page ? Number(page) : 1);
  }

  @Post(":id/cancel")
  forceCancel(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminAuctionService.forceCancel(requester.sub, id, body?.reason);
  }
}
