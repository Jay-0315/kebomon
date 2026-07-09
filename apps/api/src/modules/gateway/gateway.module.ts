import { Module } from "@nestjs/common";
import { ChatGateway } from "./chat.gateway";
import { RaidGateway } from "./raid.gateway";
import { BattleGateway } from "./battle.gateway";
import { DuelGateway } from "./duel.gateway";
import { RaidController } from "./raid.controller";
import { DuelController } from "./duel.controller";
import { RewardsModule } from "../rewards/rewards.module";

@Module({
  imports: [RewardsModule],
  providers: [ChatGateway, RaidGateway, BattleGateway, DuelGateway],
  exports: [ChatGateway, RaidGateway, BattleGateway, DuelGateway],
  controllers: [RaidController, DuelController],
})
export class GatewayModule {}
