import { Module } from "@nestjs/common";
import { RewardsModule } from "../rewards/rewards.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { JwtAuthModule } from "./jwt-auth.module";

@Module({
  imports: [RewardsModule, JwtAuthModule],
  controllers: [AuthController],
  providers: [AuthService, EmailService],
  exports: [JwtAuthModule, EmailService],
})
export class AuthModule {}
