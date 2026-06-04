import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { RaidGateway } from "./raid.gateway";
import { RewardsModule } from "../rewards/rewards.module";

@Module({
  imports: [RewardsModule],
  providers: [ChatGateway, RaidGateway],
  exports: [ChatGateway, RaidGateway],
})
export class GatewayModule {}
