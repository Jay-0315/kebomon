import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PostCategory } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RewardsService } from "../rewards/rewards.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { CreateCommunityPostDto } from "./dto/create-community-post.dto";
import { UpdateCommentDto } from "./dto/update-comment.dto";
import { UpdateCommunityPostDto } from "./dto/update-community-post.dto";

const PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 10;
const RECENT_COMMENTS = 3;

// NOTE: prisma generate 실행 후 타입 오류 해소됨
const userSelect = { id: true, name: true, profilePhoto: true, reward: { select: { equippedTitleId: true, equippedBorderId: true } } };

const postInclude = {
  user: { select: userSelect },
  _count: { select: { comments: true } },
  comments: {
    where: { parentId: null },
    take: RECENT_COMMENTS,
    orderBy: { createdAt: "desc" as const },
    include: { user: { select: userSelect } },
  },
};

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewards: RewardsService,
    private readonly notifications: NotificationsService,
  ) {}

  //내부 포맷 헬퍼

  private formatComment(c: any): object {
    return {
      id: String(c.id),
      postId: c.postId,
      authorId: c.userId,
      authorName: c.user?.name ?? "사용자",
      authorPhotoUrl: c.user?.profilePhoto ?? null,
      authorEquippedTitleId: c.user?.reward?.equippedTitleId ?? null,
      authorEquippedBorderId: c.user?.reward?.equippedBorderId ?? null,
      parentId: c.parentId != null ? String(c.parentId) : null,
      content: c.content,
      imageUrl: c.imageUrl ?? null,
      replies: (c.replies ?? []).map((r: any) => this.formatComment(r)),
      createdAt: String(c.createdAt),
      updatedAt: String(c.updatedAt),
    };
  }

  private formatPost(post: any, isLiked: boolean): object {
    return {
      id: post.id,
      authorId: post.userId,
      authorName: post.user?.name ?? "사용자",
      authorPhotoUrl: post.user?.profilePhoto ?? null,
      authorEquippedTitleId: post.user?.reward?.equippedTitleId ?? null,
      authorEquippedBorderId: post.user?.reward?.equippedBorderId ?? null,
      content: post.content,
      category: post.category,
      imageUrl: post.imageUrl ?? null,
      likes: post.likesCount,
      isLiked,
      commentCount: post._count?.comments ?? 0,
      recentComments: (post.comments ?? []).map((c: any) => this.formatComment(c)),
      createdAt: String(post.createdAt),
      updatedAt: String(post.updatedAt),
    };
  }

  private async batchLiked(userId: string | undefined, postIds: string[]): Promise<Set<string>> {
    if (!userId || postIds.length === 0) return new Set();
    const likes = await this.prisma.postLike.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    return new Set(likes.map((l) => l.postId));
  }

  //게시글

  async findAll(userId?: string, page = 1, category?: PostCategory) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = category ? { category } : {};

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: postInclude as any,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    const likedSet = await this.batchLiked(userId, posts.map((p) => p.id));

    return {
      posts: posts.map((p) => this.formatPost(p, likedSet.has(p.id))),
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      hasNext: skip + posts.length < total,
    };
  }

  async findMy(userId: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = { userId };

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: postInclude as any,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    const likedSet = await this.batchLiked(userId, posts.map((p) => p.id));

    return {
      posts: posts.map((p) => this.formatPost(p, likedSet.has(p.id))),
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
      hasNext: skip + posts.length < total,
    };
  }

  async findById(postId: string, userId?: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      include: postInclude as any,
    });
    if (!post) throw new NotFoundException("게시글을 찾을 수 없습니다.");

    const likedSet = await this.batchLiked(userId, [postId]);
    return this.formatPost(post, likedSet.has(postId));
  }

  async create(dto: CreateCommunityPostDto) {
    const post = await this.prisma.communityPost.create({
      data: {
        userId: dto.userId,
        content: dto.content,
        category: (dto.category ?? "chat") as PostCategory,
        imageUrl: dto.imageUrl ?? null,
      } as any,
      include: postInclude as any,
    });

    await this.rewards.onPostCreated(dto.userId);
    await Promise.all([
      this.rewards.checkAndGrantAchievements(dto.userId),
      this.rewards.checkAndGrantTitles(dto.userId),
    ]);

    return this.formatPost(post, false);
  }

  async update(id: string, dto: UpdateCommunityPostDto) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("게시글을 찾을 수 없습니다.");

    const updated = await this.prisma.communityPost.update({
      where: { id },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.category !== undefined ? { category: dto.category as PostCategory } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      } as any,
      include: postInclude as any,
    });

    const likedSet = await this.batchLiked(dto.userId, [id]);
    return this.formatPost(updated, likedSet.has(id));
  }

  async toggleLike(postId: string, userId: string) {
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.postLike.delete({ where: { postId_userId: { postId, userId } } }),
        this.prisma.communityPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      return { isLiked: false };
    }

    await this.prisma.$transaction([
      this.prisma.postLike.create({ data: { postId, userId } }),
      this.prisma.communityPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    return { isLiked: true };
  }

  async remove(id: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("게시글을 찾을 수 없습니다.");
    await this.prisma.communityPost.delete({ where: { id } });
    return { id };
  }

  //댓글

  async getComments(postId: string, page = 1) {
    const skip = (page - 1) * COMMENT_PAGE_SIZE;
    const prisma = this.prisma as any;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, parentId: null },
        include: {
          user: { select: userSelect },
          replies: {
            include: { user: { select: userSelect } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: COMMENT_PAGE_SIZE,
      }),
      prisma.comment.count({ where: { postId, parentId: null } }),
    ]);

    return {
      comments: comments.map((c: any) => this.formatComment(c)),
      total,
      page,
      totalPages: Math.ceil(total / COMMENT_PAGE_SIZE),
    };
  }

  async createComment(postId: string, dto: CreateCommentDto) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("게시글을 찾을 수 없습니다.");

    const prisma = this.prisma as any;
    const comment = await prisma.comment.create({
      data: {
        postId,
        userId: dto.userId,
        content: dto.content ?? "",
        imageUrl: dto.imageUrl ?? null,
        parentId: dto.parentId ? BigInt(dto.parentId) : null,
      },
      include: {
        user: { select: userSelect },
        replies: { include: { user: { select: userSelect } } },
      },
    });

    // 글 작성자에게 알림 (본인 댓글 제외)
    if (post.userId !== dto.userId) {
      const commenterName = (comment as { user?: { name?: string } }).user?.name ?? "누군가";
      const preview = (dto.content ?? "").slice(0, 30);
      void this.notifications.create({
        userId: post.userId,
        type: "comment",
        title: "내 글에 새 댓글",
        body: `${commenterName}: ${preview || "(이미지)"}`,
        link: `/community/${postId}`,
      });
    }

    return this.formatComment(comment);
  }

  async updateComment(commentId: bigint, userId: string, dto: UpdateCommentDto) {
    const prisma = this.prisma as any;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException("댓글을 찾을 수 없습니다.");
    if (comment.userId !== userId) throw new ForbiddenException("본인 댓글만 수정할 수 있습니다.");

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      },
      include: {
        user: { select: userSelect },
        replies: { include: { user: { select: userSelect } } },
      },
    });

    return this.formatComment(updated);
  }

  async deleteComment(commentId: bigint, userId: string) {
    const prisma = this.prisma as any;
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException("댓글을 찾을 수 없습니다.");
    if (comment.userId !== userId) throw new ForbiddenException("본인 댓글만 삭제할 수 있습니다.");

    await prisma.comment.delete({ where: { id: commentId } });
    return { id: String(commentId) };
  }
}
