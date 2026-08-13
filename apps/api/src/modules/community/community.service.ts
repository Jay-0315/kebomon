import {
  BadRequestException,
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
const POST_CREATE_COOLDOWN_MS = 60_000;
const DUPLICATE_POST_WINDOW_MS = 10 * 60_000;

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

  private normalizeContent(content: string) {
    return content
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  //게시글

  // guildId를 생략하면 전체 공개 게시판(guildId가 null인 글만) — 길드 게시글은 여기 섞이지 않는다.
  // 특정 길드의 글을 보려면 guildId를 명시해야 하며, 이 값은 호출자(GuildService)가
  // 멤버십을 확인한 뒤 서버에서 결정한 것이어야 한다 (클라이언트가 임의로 지정하면 안 됨).
  async findAll(userId?: string, page = 1, category?: PostCategory, sort?: "latest" | "likes", guildId?: string, q?: string) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = {
      ...(category ? { category } : {}),
      guildId: guildId ?? null,
      ...(q ? { content: { contains: q } } : {}),
    };
    const orderBy =
      sort === "likes"
        ? [{ likesCount: "desc" as const }, { createdAt: "desc" as const }]
        : { createdAt: "desc" as const };

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        include: postInclude as any,
        orderBy,
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

  async findHighlights(userId?: string) {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [popular, weeklyBest] = await Promise.all([
      this.prisma.communityPost.findMany({
        where: { guildId: null },
        include: postInclude as any,
        orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      this.prisma.communityPost.findMany({
        where: { guildId: null, createdAt: { gte: weekStart } },
        include: postInclude as any,
        orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
    ]);

    const postIds = [...popular, ...weeklyBest].map((post) => post.id);
    const likedSet = await this.batchLiked(userId, postIds);

    return {
      popular: popular.map((post) => this.formatPost(post, likedSet.has(post.id))),
      weeklyBest: weeklyBest.map((post) => this.formatPost(post, likedSet.has(post.id))),
      generatedAt: new Date().toISOString(),
    };
  }

  // guildId는 클라이언트가 보낸 DTO가 아니라 호출자(GuildService)가 멤버십을 확인한 뒤
  // 서버에서 결정해 넘기는 값이다 — 절대 클라이언트 입력을 그대로 신뢰하면 안 됨.
  async create(dto: CreateCommunityPostDto, guildId: string | null = null) {
    const normalized = this.normalizeContent(dto.content);
    if (normalized.length < 8 && !dto.imageUrl) {
      throw new BadRequestException("게시글 내용은 8자 이상 입력해주세요.");
    }

    const recentPost = await this.prisma.communityPost.findFirst({
      where: {
        userId: dto.userId,
        guildId,
        createdAt: { gte: new Date(Date.now() - POST_CREATE_COOLDOWN_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (recentPost) {
      throw new BadRequestException("게시글은 1분에 한 번 작성할 수 있습니다.");
    }

    const duplicateCandidates = await this.prisma.communityPost.findMany({
      where: {
        userId: dto.userId,
        guildId,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_POST_WINDOW_MS) },
      },
      select: { content: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });
    if (duplicateCandidates.some((post) => this.normalizeContent(post.content) === normalized)) {
      throw new BadRequestException("동일한 내용의 게시글은 잠시 후 다시 작성할 수 있습니다.");
    }

    const post = await this.prisma.communityPost.create({
      data: {
        userId: dto.userId,
        content: dto.content,
        category: (dto.category ?? "chat") as PostCategory,
        imageUrl: dto.imageUrl ?? null,
        guildId,
      } as any,
      include: postInclude as any,
    });

    await this.rewards.onPostCreated(dto.userId);
    await Promise.all([
      this.rewards.checkAndGrantAchievements(dto.userId),
      this.rewards.checkAndGrantTitles(dto.userId),
    ]);
    void this.rewards.markQuestDone(dto.userId, "community").catch(() => undefined);
    void this.rewards.incrementWeeklyQuestProgress(dto.userId, "community").catch(() => undefined);

    return this.formatPost(post, false);
  }

  async update(id: string, requesterId: string, dto: UpdateCommunityPostDto) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("게시글을 찾을 수 없습니다.");
    if (post.userId !== requesterId) throw new ForbiddenException("본인 글만 수정할 수 있습니다.");

    const updated = await this.prisma.communityPost.update({
      where: { id },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.category !== undefined ? { category: dto.category as PostCategory } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      } as any,
      include: postInclude as any,
    });

    const likedSet = await this.batchLiked(requesterId, [id]);
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

  async remove(id: string, requesterId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("게시글을 찾을 수 없습니다.");
    if (post.userId !== requesterId) throw new ForbiddenException("본인 글만 삭제할 수 있습니다.");
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
        titleJa: "自分の投稿に新しいコメント",
        bodyJa: `${commenterName}: ${preview || "（画像）"}`,
        link: `/community/${postId}`,
      }).catch(() => undefined);
    }
    void this.rewards.markQuestDone(dto.userId, "community").catch(() => undefined);
    void this.rewards.incrementWeeklyQuestProgress(dto.userId, "community").catch(() => undefined);

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
