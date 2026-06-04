import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CreateGroupDto } from "./dto/create-group.dto";
import { HandleJoinRequestDto } from "./dto/handle-request.dto";
import { JoinByCodeDto } from "./dto/join-group.dto";
import { TransferHostDto } from "./dto/transfer-host.dto";
import { GroupsService } from "./groups.service";

@UseGuards(JwtAuthGuard)
@Controller("groups")
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  getMyGroups(@CurrentUser() user: any) {
    return this.groupsService.getMyGroups(user.sub);
  }

  @Post()
  createGroup(@CurrentUser() user: any, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user.sub, dto);
  }

  @Get("search")
  searchPublicGroups(@Query("q") q?: string) {
    return this.groupsService.searchPublicGroups(q);
  }

  @Get(":id")
  getGroupDetail(@Param("id") id: string, @CurrentUser() user: any) {
    return this.groupsService.getGroupDetail(id, user.sub);
  }

  @Delete(":id")
  deleteGroup(@Param("id") id: string, @CurrentUser() user: any) {
    return this.groupsService.deleteGroup(id, user.sub);
  }

  @Patch(":id/host")
  transferHost(
    @Param("id") id: string,
    @CurrentUser() user: any,
    @Body() dto: TransferHostDto,
  ) {
    return this.groupsService.transferHost(id, user.sub, dto);
  }

  @Post("join")
  joinByCode(@CurrentUser() user: any, @Body() dto: JoinByCodeDto) {
    return this.groupsService.joinByCode(user.sub, dto);
  }

  @Post(":id/requests")
  sendJoinRequest(@Param("id") id: string, @CurrentUser() user: any) {
    return this.groupsService.sendJoinRequest(id, user.sub);
  }

  @Get(":id/expenses")
  getGroupExpenses(@Param("id") id: string, @CurrentUser() user: any) {
    return this.groupsService.getGroupExpenses(id, user.sub);
  }

  @Get(":id/requests")
  getPendingRequests(@Param("id") id: string, @CurrentUser() user: any) {
    return this.groupsService.getPendingRequests(id, user.sub);
  }

  @Patch(":id/requests/:reqId")
  handleRequest(
    @Param("id") id: string,
    @Param("reqId", ParseIntPipe) reqId: number,
    @CurrentUser() user: any,
    @Body() dto: HandleJoinRequestDto,
  ) {
    return this.groupsService.handleRequest(id, BigInt(reqId), user.sub, dto);
  }

  @Delete(":id/members/me")
  leaveGroup(@Param("id") id: string, @CurrentUser() user: any) {
    return this.groupsService.leaveGroup(id, user.sub);
  }
}
