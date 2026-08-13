import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PostCategory } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CreateCommunityPostDto } from "./dto/create-community-post.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { UpdateCommunityPostDto } from "./dto/update-community-post.dto";
import { CommunityService } from "./community.service";

@Controller("community/posts")
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  //게시글

  @Get()
  findAll(
    @Query("userId") userId?: string,
    @Query("page") page?: string,
    @Query("category") category?: PostCategory,
    @Query("sort") sort?: "latest" | "likes",
    @Query("q") q?: string,
  ) {
    return this.communityService.findAll(userId, page ? Number(page) : 1, category, sort, undefined, q);
  }

  @Get("my")
  findMy(@Query("userId") userId: string, @Query("page") page?: string) {
    return this.communityService.findMy(userId, page ? Number(page) : 1);
  }

  @Get("highlights")
  findHighlights(@Query("userId") userId?: string) {
    return this.communityService.findHighlights(userId);
  }

  @Get(":id")
  findById(@Param("id") id: string, @Query("userId") userId?: string) {
    return this.communityService.findById(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateCommunityPostDto) {
    dto.userId = user.sub;
    return this.communityService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  update(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: UpdateCommunityPostDto,
  ) {
    return this.communityService.update(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/like")
  toggleLike(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.communityService.toggleLike(id, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  remove(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.communityService.remove(id, user.sub);
  }

  //댓글

  @Get(":id/comments")
  getComments(@Param("id") id: string, @Query("page") page?: string) {
    return this.communityService.getComments(id, page ? Number(page) : 1);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/comments")
  createComment(
    @CurrentUser() user: { sub: string },
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
  ) {
    dto.userId = user.sub;
    return this.communityService.createComment(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id/comments/:commentId")
  updateComment(
    @CurrentUser() user: { sub: string },
    @Param("commentId", ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.communityService.updateComment(BigInt(commentId), user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id/comments/:commentId")
  deleteComment(
    @CurrentUser() user: { sub: string },
    @Param("commentId", ParseIntPipe) commentId: number,
  ) {
    return this.communityService.deleteComment(BigInt(commentId), user.sub);
  }
}
