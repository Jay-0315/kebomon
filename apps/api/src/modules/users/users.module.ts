import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule, ExchangeRatesModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
