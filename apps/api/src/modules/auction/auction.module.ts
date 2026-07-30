import { Module } from "@nestjs/common";
import { AuctionController } from "./auction.controller";
import { AuctionService } from "./auction.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [NotificationsModule, JwtAuthModule],
  controllers: [AuctionController],
  providers: [AuctionService],
})
export class AuctionModule {}
