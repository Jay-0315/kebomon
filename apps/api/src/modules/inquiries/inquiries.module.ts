import { Module } from "@nestjs/common";
import { JwtAuthModule } from "../auth/jwt-auth.module";
import { InquiriesController } from "./inquiries.controller";
import { InquiriesService } from "./inquiries.service";

@Module({
  imports: [JwtAuthModule],
  controllers: [InquiriesController],
  providers: [InquiriesService],
})
export class InquiriesModule {}
