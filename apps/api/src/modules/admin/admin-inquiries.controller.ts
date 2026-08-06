import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminInquiriesService } from "./admin-inquiries.service";
import { ReplyInquiryDto } from "./dto/reply-inquiry.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/inquiries")
export class AdminInquiriesController {
  constructor(private readonly adminInquiriesService: AdminInquiriesService) {}

  @Get()
  findAll(@Query("status") status?: string, @Query("page") page?: string) {
    return this.adminInquiriesService.findAll(status, page ? Number(page) : 1);
  }

  @Patch(":id/reply")
  reply(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() dto: ReplyInquiryDto,
  ) {
    return this.adminInquiriesService.reply(requester.sub, id, dto);
  }
}
