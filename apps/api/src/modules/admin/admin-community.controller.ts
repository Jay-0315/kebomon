import { Controller, Delete, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { PostCategory } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminCommunityService } from "./admin-community.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/community")
export class AdminCommunityController {
  constructor(private readonly adminCommunityService: AdminCommunityService) {}

  @Get("posts")
  findPosts(
    @Query("q") q?: string,
    @Query("category") category?: PostCategory,
    @Query("page") page?: string,
  ) {
    return this.adminCommunityService.findPosts(q, category, page ? Number(page) : 1);
  }

  @Delete("posts/:id")
  removePost(@Param("id") id: string) {
    return this.adminCommunityService.removePost(id);
  }

  @Get("comments")
  findComments(
    @Query("q") q?: string,
    @Query("postId") postId?: string,
    @Query("page") page?: string,
  ) {
    return this.adminCommunityService.findComments(q, postId, page ? Number(page) : 1);
  }

  @Delete("comments/:id")
  removeComment(@Param("id", ParseIntPipe) id: number) {
    return this.adminCommunityService.removeComment(BigInt(id));
  }
}
