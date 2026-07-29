import { Module } from "@nestjs/common";
import { FishingController } from "./fishing.controller";
import { FishingService } from "./fishing.service";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [JwtAuthModule],
  controllers: [FishingController],
  providers: [FishingService],
})
export class FishingModule {}
