import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { RaidGateway } from "./raid.gateway";
import { BattleGateway } from "./battle.gateway";
import { RewardsModule } from "../rewards/rewards.module";

@Module({
  imports: [RewardsModule],
  providers: [ChatGateway, RaidGateway, BattleGateway],
  exports: [ChatGateway, RaidGateway, BattleGateway],
})
export class GatewayModule {}
