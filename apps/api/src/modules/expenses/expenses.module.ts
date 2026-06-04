import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RewardsModule } from "../rewards/rewards.module";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";

@Module({
  imports: [AuthModule, RewardsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
