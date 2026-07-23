import { Module } from "@nestjs/common";
import { JwtAuthModule } from "../auth/jwt-auth.module";
import { BannersController } from "./banners.controller";
import { BannersService } from "./banners.service";

@Module({
  imports: [JwtAuthModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
