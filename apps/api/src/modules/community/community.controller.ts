import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { PostCategory } from "@prisma/client";
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
  ) {
    return this.communityService.findAll(userId, page ? Number(page) : 1, category);
  }

  @Get("my")
  findMy(@Query("userId") userId: string, @Query("page") page?: string) {
    return this.communityService.findMy(userId, page ? Number(page) : 1);
  }

  @Get(":id")
  findById(@Param("id") id: string, @Query("userId") userId?: string) {
    return this.communityService.findById(id, userId);
  }

  @Post()
  create(@Body() dto: CreateCommunityPostDto) {
    return this.communityService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCommunityPostDto) {
    return this.communityService.update(id, dto);
  }

  @Post(":id/like")
  toggleLike(@Param("id") id: string, @Body("userId") userId: string) {
    return this.communityService.toggleLike(id, userId);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.communityService.remove(id);
  }

  //댓글

  @Get(":id/comments")
  getComments(@Param("id") id: string, @Query("page") page?: string) {
    return this.communityService.getComments(id, page ? Number(page) : 1);
  }

  @Post(":id/comments")
  createComment(@Param("id") id: string, @Body() dto: CreateCommentDto) {
    return this.communityService.createComment(id, dto);
  }

  @Patch(":id/comments/:commentId")
  updateComment(
    @Param("commentId", ParseIntPipe) commentId: number,
    @Query("userId") userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.communityService.updateComment(BigInt(commentId), userId, dto);
  }

  @Delete(":id/comments/:commentId")
  deleteComment(
    @Param("commentId", ParseIntPipe) commentId: number,
    @Query("userId") userId: string,
  ) {
    return this.communityService.deleteComment(BigInt(commentId), userId);
  }
}
