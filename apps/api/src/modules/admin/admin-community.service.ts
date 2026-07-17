import { Injectable, NotFoundException } from "@nestjs/common";
import { PostCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 20;

@Injectable()
export class AdminCommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async findPosts(q?: string, category?: PostCategory, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = {
      ...(q ? { content: { contains: q } } : {}),
      ...(category ? { category } : {}),
    };

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return {
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        category: p.category,
        imageUrl: p.imageUrl,
        likesCount: p.likesCount,
        createdAt: p.createdAt,
        author: p.user,
      })),
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async removePost(id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("게시글을 찾을 수 없습니다.");
    await this.prisma.communityPost.delete({ where: { id } });
    return { id };
  }

  async findComments(q?: string, postId?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = {
      ...(q ? { content: { contains: q } } : {}),
      ...(postId ? { postId } : {}),
    };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      comments: comments.map((c) => ({
        id: String(c.id),
        postId: c.postId,
        content: c.content,
        createdAt: c.createdAt,
        author: c.user,
      })),
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async removeComment(id: bigint) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException("댓글을 찾을 수 없습니다.");
    await this.prisma.comment.delete({ where: { id } });
    return { id: String(id) };
  }
}
