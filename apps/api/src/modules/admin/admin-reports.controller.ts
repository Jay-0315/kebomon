import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminReportsService } from "./admin-reports.service";
import { UpdateReportStatusDto } from "./dto/update-report-status.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/reports")
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get()
  findAll(@Query("status") status?: string, @Query("page") page?: string) {
    return this.adminReportsService.findAll(status, page ? Number(page) : 1);
  }

  @Patch(":id")
  updateStatus(
    @CurrentUser() requester: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.adminReportsService.updateStatus(requester.sub, id, dto);
  }
}
