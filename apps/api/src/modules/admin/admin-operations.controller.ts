import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminOperationsService } from "./admin-operations.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/operations")
export class AdminOperationsController {
  constructor(private readonly adminOperationsService: AdminOperationsService) {}

  @Get("summary")
  getSummary() {
    return this.adminOperationsService.getSummary();
  }

  @Get("reward-logs")
  getRewardLogs(
    @Query("q") q?: string,
    @Query("reason") reason?: string,
    @Query("source") source?: string,
    @Query("sourceId") sourceId?: string,
    @Query("direction") direction?: "earned" | "spent" | "all",
    @Query("page") page?: string,
  ) {
    return this.adminOperationsService.getRewardLogs({
      q,
      reason,
      source,
      sourceId,
      direction,
      page: page ? Number(page) : 1,
    });
  }

  @Get("balance-history")
  getBalanceHistory(@Query("page") page?: string) {
    return this.adminOperationsService.getBalanceHistory(page ? Number(page) : 1);
  }
}
