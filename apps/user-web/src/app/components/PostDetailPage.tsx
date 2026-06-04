import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Heart, MessageCircle, Image, X, Pencil, Trash2, CornerDownRight,
} from "lucide-react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { compressImage } from "../lib/image-utils";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { formatRelativeTime } from "../lib/date-utils";
import RichTextEditor from "./RichTextEditor";
import TitleBadge from "./TitleBadge";
import UserAvatar from "./UserAvatar";
import type { CommunityPost, Comment, CommentsPage, PostCategory } from "../types/domain";

const CATEGORY_OPTIONS: PostCategory[] = ["brag", "tip", "chat"];

const CAT_STYLE: Record<PostCategory, string> = {
  brag: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  tip: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  chat: "bg-muted text-muted-foreground",
};

function mapComment(c: Record<string, unknown>): Comment {
  return {
    id: String(c.id),
    postId: String(c.postId),
    authorId: String(c.authorId),
    authorName: String(c.authorName ?? "사용자"),
    authorPhotoUrl: (c.authorPhotoUrl as string | null | undefined) ?? null,
    authorEquippedTitleId: (c.authorEquippedTitleId as number | null | undefined) ?? null,
    parentId: c.parentId != null ? String(c.parentId) : null,
    content: String(c.content),
    imageUrl: (c.imageUrl as string | null) ?? null,
    replies: Array.isArray(c.replies)
      ? (c.replies as Record<string, unknown>[]).map(mapComment)
      : [],
    createdAt: String(c.createdAt),
    updatedAt: String(c.updatedAt),
  };
}

// ── 댓글 카드 ────────────────────────────────────────────────

interface CommentCardProps {
  comment: Comment;
  currentUserId: string;
  onReply: (parentId: string, parentAuthor: string) => void;
  onDelete: (id: string) => void;
  onEdit: (comment: Comment) => void;
  isReply?: boolean;
}

function CommentCard({ comment, currentUserId, onReply, onDelete, onEdit, isReply }: CommentCardProps) {
  const { t, lang } = useLang();
  return (
    <div className={`flex gap-3 ${isReply ? "ml-8 mt-2" : ""}`}>
      {isReply && <CornerDownRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
      <div className="flex-1 bg-muted/40 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <UserAvatar authorId={comment.authorId} authorName={comment.authorName} size="xs" photoUrl={comment.authorPhotoUrl} />
            <span className="text-xs font-medium">{comment.authorName}</span>
            {comment.authorEquippedTitleId && (
              <TitleBadge titleId={comment.authorEquippedTitleId} size="xs" />
            )}
            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.createdAt, lang)}</span>
          </div>
          <div className="flex gap-1 shrink-0">
            {!isReply && (
              <button
                onClick={() => onReply(comment.id, comment.authorName)}
                className="text-[10px] text-primary hover:underline px-1"
              >
                {t("comment.reply")}
              </button>
            )}
            {comment.authorId === currentUserId && (
              <>
                <button onClick={() => onEdit(comment)} className="p-1 rounded hover:bg-accent/30 transition-colors">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => onDelete(comment.id)} className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        {comment.imageUrl && (
          <img src={comment.imageUrl} alt="" className="mt-2 max-h-40 rounded-md object-cover border border-border" />
        )}
        {comment.replies.map((reply) => (
          <CommentCard
            key={reply.id}
            comment={reply}
            currentUserId={currentUserId}
            onReply={onReply}
            onDelete={onDelete}
            onEdit={onEdit}
            isReply
          />
        ))}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { togglePostLike, deletePost } = useAppData();
  const { t, lang } = useLang();
  const currentUser = getStoredUser();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [commentsData, setCommentsData] = useState<CommentsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // 게시글 수정 폼
  const [showPostEdit, setShowPostEdit] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<PostCategory>("chat");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 댓글 작성/수정 폼
  const [commentContent, setCommentContent] = useState("");
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const catLabel = (cat: PostCategory) => t(`community.${cat}` as Parameters<typeof t>[0]);
  const isContentEmpty = (html: string) => html.replace(/<[^>]*>/g, "").trim().length === 0;

  const fetchPost = async () => {
    if (!id) return;
    try {
      const data = await api.get<Record<string, unknown>>(
        `/community/posts/${id}${currentUser ? `?userId=${currentUser.id}` : ""}`,
      );
      setPost({
        id: String(data.id),
        authorId: String(data.authorId),
        authorName: String(data.authorName ?? "사용자"),
        authorPhotoUrl: (data.authorPhotoUrl as string | null | undefined) ?? null,
        authorEquippedTitleId: (data.authorEquippedTitleId as number | null | undefined) ?? null,
        content: String(data.content),
        category: (data.category as PostCategory) ?? "chat",
        imageUrl: (data.imageUrl as string | null) ?? null,
        likes: Number(data.likes ?? 0),
        isLiked: Boolean(data.isLiked),
        commentCount: Number(data.commentCount ?? 0),
        recentComments: [],
        createdAt: String(data.createdAt),
        updatedAt: String(data.updatedAt),
      });
    } catch {
      navigate("/community");
    }
  };

  const fetchComments = async (p = page) => {
    if (!id) return;
    const data = await api.get<{
      comments: Record<string, unknown>[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/community/posts/${id}/comments?page=${p}`);
    setCommentsData({
      comments: data.comments.map(mapComment),
      total: data.total,
      page: data.page,
      totalPages: data.totalPages,
    });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPost(), fetchComments(1)]).finally(() => setLoading(false));
  }, [id]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchComments(p);
  };

  const handleLike = async () => {
    if (!post) return;
    await togglePostLike(post.id);
    await fetchPost();
  };

  const handleDeletePost = async () => {
    if (!post) return;
    await deletePost(post.id);
    navigate("/community");
  };

  const openPostEdit = () => {
    if (!post) return;
    setEditContent(post.content);
    setEditCategory(post.category);
    setShowPostEdit(true);
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !currentUser || editSubmitting) return;
    setEditSubmitting(true);
    try {
      await api.patch(`/community/posts/${post.id}`, {
        userId: currentUser.id,
        content: editContent,
        category: editCategory,
      });
      setShowPostEdit(false);
      await fetchPost();
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCommentImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCommentImage(await compressImage(file));
  };

  const startReply = (parentId: string, parentAuthor: string) => {
    setReplyTo({ id: parentId, author: parentAuthor });
    setEditingComment(null);
    setCommentContent("");
    setCommentImage(null);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment);
    setReplyTo(null);
    setCommentContent(comment.content);
    setCommentImage(comment.imageUrl);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const cancelForm = () => {
    setReplyTo(null);
    setEditingComment(null);
    setCommentContent("");
    setCommentImage(null);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() && !commentImage) return;
    if (!currentUser || !id || submitting) return;
    setSubmitting(true);
    try {
      if (editingComment) {
        await api.patch(`/community/posts/${id}/comments/${editingComment.id}?userId=${currentUser.id}`, {
          content: commentContent,
          imageUrl: commentImage,
        });
      } else {
        await api.post(`/community/posts/${id}/comments`, {
          userId: currentUser.id,
          content: commentContent,
          imageUrl: commentImage ?? undefined,
          parentId: replyTo?.id ?? undefined,
        });
      }
      cancelForm();
      await Promise.all([fetchPost(), fetchComments(page)]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser || !id) return;
    await api.delete(`/community/posts/${id}/comments/${commentId}?userId=${currentUser.id}`);
    await Promise.all([fetchPost(), fetchComments(page)]);
  };

  if (loading || !post) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 상단 네비 */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/community")} className="p-2 rounded-md bg-muted hover:bg-accent/30 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold">{t("nav.community")}</h2>
      </div>

      {/* 게시글 본문 */}
      <div className="bg-card rounded border border-border p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <UserAvatar authorId={post.authorId} authorName={post.authorName} photoUrl={post.authorPhotoUrl} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{post.authorName}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CAT_STYLE[post.category]}`}>
                  {catLabel(post.category)}
                </span>
              </div>
              {post.authorEquippedTitleId && (
                <TitleBadge titleId={post.authorEquippedTitleId} size="xs" />
              )}
              <p className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt, lang)}</p>
            </div>
          </div>
          {post.authorId === currentUser?.id && (
            <div className="flex gap-1.5 shrink-0">
              <button onClick={openPostEdit} className="p-1.5 rounded bg-muted hover:bg-accent/20 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDeletePost} className="p-1.5 rounded bg-muted text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div
          className="tiptap-content text-sm leading-relaxed mb-3"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="flex items-center gap-4 pt-3 border-t border-border text-muted-foreground">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${post.isLiked ? "text-primary" : "hover:text-primary"}`}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`} />
            {post.likes}
          </button>
          <div className="flex items-center gap-1.5 text-sm">
            <MessageCircle className="w-4 h-4" />
            {post.commentCount}
          </div>
        </div>
      </div>

      {/* 댓글 목록 */}
      <div className="bg-card rounded border border-border p-4">
        <h3 className="text-sm font-semibold mb-4">{t("comment.count")} {post.commentCount}{t("comment.count_suffix")}</h3>

        {commentsData && commentsData.comments.length > 0 ? (
          <div className="space-y-3">
            {commentsData.comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserId={currentUser?.id ?? ""}
                onReply={startReply}
                onDelete={handleDeleteComment}
                onEdit={startEdit}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">{t("comment.first")}</p>
        )}

        {/* 페이지네이션 */}
        {commentsData && commentsData.totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-4">
            {Array.from({ length: commentsData.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  p === commentsData.page
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent/30"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 댓글 작성 폼 */}
      <div ref={formRef} className="bg-card rounded border border-border p-4">
        {(replyTo || editingComment) && (
          <div className="flex items-center justify-between mb-3 p-2 bg-muted/60 rounded text-xs text-muted-foreground">
            <span>
              {editingComment ? t("comment.editing") : `${replyTo!.author}${t("comment.reply_to")}`}
            </span>
            <button onClick={cancelForm} className="hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleCommentSubmit} className="space-y-3">
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder={t("comment.placeholder")}
            rows={3}
            className="w-full px-3 py-2 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
          />

          {commentImage ? (
            <div className="relative inline-block">
              <img src={commentImage} alt="" className="max-h-32 rounded-md object-cover border border-border" />
              <button
                type="button"
                onClick={() => setCommentImage(null)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => commentFileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Image className="w-4 h-4" />
              {t("comment.attach_image")}
            </button>
            <input ref={commentFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleCommentImage} />
            <button
              type="submit"
              disabled={submitting || (!commentContent.trim() && !commentImage)}
              className="px-4 py-1.5 bg-primary/80 text-primary-foreground rounded-md text-sm font-medium hover:shadow-md transition-all disabled:opacity-60"
            >
              {submitting ? "..." : editingComment ? t("comment.edit_btn") : t("comment.submit_btn")}
            </button>
          </div>
        </form>
      </div>

      {/* 게시글 수정 모달 */}
      {showPostEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => setShowPostEdit(false)}>
          <div className="bg-card rounded-t-xl sm:rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3>{t("community.edit_post")}</h3>
              <button onClick={() => setShowPostEdit(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostUpdate} className="space-y-4">
              <div className="flex gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setEditCategory(cat)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-all ${
                      editCategory === cat
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {catLabel(cat)}
                  </button>
                ))}
              </div>

              <RichTextEditor
                content={editContent}
                onChange={setEditContent}
                placeholder={t("community.placeholder")}
              />

              <button
                type="submit"
                disabled={editSubmitting || isContentEmpty(editContent)}
                className="w-full bg-primary/80 text-primary-foreground rounded-md py-3 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60"
              >
                {editSubmitting ? "..." : t("community.update")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
