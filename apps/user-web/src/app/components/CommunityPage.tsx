import { useCallback, useEffect, useState } from "react";
import { Heart, Plus, X, MessageCircle, ChevronRight } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import { useNavigate } from "react-router";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatRelativeTime } from "../lib/date-utils";
import { extractFirstImage } from "../lib/image-utils";
import TitleBadge from "./TitleBadge";
import UserAvatar from "./UserAvatar";
import type { CommunityPost, PostCategory, Comment } from "../types/domain";

const CATEGORY_OPTIONS: PostCategory[] = ["brag", "tip", "chat"];

const CAT_STYLE: Record<PostCategory, string> = {
  brag: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  tip: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  chat: "bg-muted text-muted-foreground",
};

function mapComment(c: Record<string, unknown>): Comment {
  const u = (c.user as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(c.id),
    postId: String(c.postId ?? ""),
    authorId: String(c.userId ?? c.authorId),
    authorName: String(u.name ?? c.authorName ?? "사용자"),
    authorPhotoUrl: (c.authorPhotoUrl as string | null | undefined) ?? (u.profilePhoto as string | null | undefined) ?? null,
    authorEquippedTitleId: (c.authorEquippedTitleId as number | null | undefined) ?? null,
    parentId: null,
    content: String(c.content ?? ""),
    imageUrl: (c.imageUrl as string | null) ?? null,
    replies: [],
    createdAt: String(c.createdAt),
    updatedAt: String(c.updatedAt),
  };
}

function mapPost(raw: Record<string, unknown>): CommunityPost {
  const u = (raw.user as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(raw.id),
    authorId: String(raw.userId ?? raw.authorId),
    authorName: String(u.name ?? raw.authorName ?? "사용자"),
    authorPhotoUrl: (raw.authorPhotoUrl as string | null | undefined) ?? (u.profilePhoto as string | null | undefined) ?? null,
    authorEquippedTitleId: (raw.authorEquippedTitleId as number | null | undefined) ?? null,
    content: String(raw.content),
    category: (raw.category as PostCategory) ?? "chat",
    imageUrl: (raw.imageUrl as string | null) ?? null,
    likes: Number(raw.likes ?? raw.likesCount ?? 0),
    isLiked: Boolean(raw.isLiked),
    commentCount: Number(raw.commentCount ?? 0),
    recentComments: Array.isArray(raw.recentComments)
      ? (raw.recentComments as Record<string, unknown>[]).map(mapComment)
      : [],
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const { createPost } = useAppData();
  const { t, lang } = useLang();
  const currentUser = getStoredUser();

  const [activeTab, setActiveTab] = useState<PostCategory | "all">("all");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [postCategory, setPostCategory] = useState<PostCategory>("chat");
  const [submitting, setSubmitting] = useState(false);

  const catLabel = (cat: PostCategory) => t(`community.${cat}` as Parameters<typeof t>[0]);

  const isContentEmpty = (html: string) => html.replace(/<[^>]*>/g, "").trim().length === 0;

  const stripHtml = (html: string) =>
    html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const fetchPosts = useCallback(async (p: number, cat: PostCategory | "all") => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p) });
      if (currentUser) qs.set("userId", currentUser.id);
      if (cat !== "all") qs.set("category", cat);
      const data = await api.get<{ posts: Record<string, unknown>[]; totalPages: number }>(
        `/community/posts?${qs.toString()}`,
      );
      setPosts(data.posts.map(mapPost));
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    setPage(1);
    void fetchPosts(1, activeTab);
  }, [activeTab]);

  const handlePageChange = (p: number) => {
    setPage(p);
    void fetchPosts(p, activeTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openCreate = () => {
    setContent("");
    setPostCategory("chat");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setContent("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isContentEmpty(content) || submitting) return;
    setSubmitting(true);
    try {
      await createPost({ content, category: postCategory, imageUrl: undefined });
      closeForm();
      setPage(1);
      await fetchPosts(1, activeTab);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!currentUser) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );
    await api.post(`/community/posts/${postId}/like`, { userId: currentUser.id });
  };

  const tabs: (PostCategory | "all")[] = ["all", ...CATEGORY_OPTIONS];

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2>{t("nav.community")}</h2>
        <button
          onClick={openCreate}
          className="bg-primary/80 text-primary-foreground rounded-md w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-muted p-1 rounded-md">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
              activeTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "all" ? t("community.all") : catLabel(tab)}
          </button>
        ))}
      </div>

      {/* 게시글 목록 */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-card rounded border border-border p-10 text-center text-muted-foreground text-sm">
            {t("common.loading")}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded border border-border p-10 text-center text-muted-foreground text-sm">
            {t("community.no_posts")}
          </div>
        ) : (
          posts.map((post) => {
            const thumb = extractFirstImage(post.content);
            return (
              <div
                key={post.id}
                className="bg-card rounded border border-border hover:border-primary/20 transition-colors"
              >
                {/* 헤더 + 미리보기 통합 */}
                <div
                  className="flex gap-3 p-4 pb-3 cursor-pointer"
                  onClick={() => navigate(`/community/${post.id}`)}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2.5">
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
                    <p className="text-sm leading-relaxed line-clamp-3 text-foreground/90">
                      {stripHtml(post.content)}
                    </p>
                  </div>
                  {thumb && (
                    <img
                      src={thumb}
                      alt=""
                      className="w-20 h-20 object-cover rounded-md border border-border shrink-0 self-center"
                    />
                  )}
                </div>

                {/* 최근 댓글 미리보기 */}
                {post.recentComments.length > 0 && (
                  <div className="mx-4 mb-2 bg-muted/50 rounded-md p-2 space-y-1">
                    {post.recentComments.map((c) => (
                      <p key={c.id} className="text-xs text-muted-foreground line-clamp-1">
                        <span className="font-medium text-foreground/70">{c.authorName}</span>{" "}
                        {c.content || <span className="italic">({t("common.photo")})</span>}
                      </p>
                    ))}
                  </div>
                )}

                {/* 하단 액션 바 */}
                <div className="flex items-center gap-4 px-4 py-3 border-t border-border text-muted-foreground">
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleToggleLike(post.id); }}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${post.isLiked ? "text-primary" : "hover:text-primary"}`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`} />
                    {post.likes}
                  </button>
                  <button
                    onClick={() => navigate(`/community/${post.id}`)}
                    className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {post.commentCount}
                  </button>
                  <button
                    onClick={() => navigate(`/community/${post.id}`)}
                    className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t("community.view_detail")}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent/30"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* 글 작성 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={closeForm}>
          <div className="bg-card rounded-t-xl sm:rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3>{t("community.new_post")}</h3>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPostCategory(cat)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-all ${
                      postCategory === cat
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {catLabel(cat)}
                  </button>
                ))}
              </div>

              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder={t("community.placeholder")}
              />

              <button
                type="submit"
                disabled={submitting || isContentEmpty(content)}
                className="w-full bg-primary/80 text-primary-foreground rounded-md py-3 font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60"
              >
                {submitting ? "..." : t("community.submit")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
