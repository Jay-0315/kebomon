import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CreateInquiryDto } from "./dto/create-inquiry.dto";
import { InquiriesService } from "./inquiries.service";

@UseGuards(JwtAuthGuard)
@Controller("inquiries")
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(user.sub, dto);
  }

  @Get("mine")
  findMine(@CurrentUser() user: { sub: string }) {
    return this.inquiriesService.findMine(user.sub);
  }
}
