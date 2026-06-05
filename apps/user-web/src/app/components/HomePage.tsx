import { useNavigate, Link } from "react-router";
import { Heart, Pencil, ChevronRight, TrendingUp, MessageSquare, Award } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { CHARACTERS } from "../data/characters";
import { formatRelativeTime } from "../lib/date-utils";
import { extractFirstImage } from "../lib/image-utils";
import TitleBadge from "./TitleBadge";
import UserAvatar from "./UserAvatar";

export default function HomePage() {
  const navigate = useNavigate();
  const { posts, profile, rewardSummary, profilePhoto, togglePostLike } = useAppData();
  const { t, lang } = useLang();

  const recentPosts = posts.slice(0, 5);

  return (
    <div className="space-y-5">

      {/* ── Profile banner ── */}
      <div className="bg-card rounded border border-border p-5 flex items-center gap-4">
        <div
          onClick={() => navigate("/mypage")}
          className="shrink-0 cursor-pointer"
        >
          {profilePhoto ? (
            <img src={profilePhoto} alt={profile.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/40" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/70 to-accent/80 flex items-center justify-center text-white font-bold text-xl">
              {profile.name[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{profile.name}</p>
          {rewardSummary.equippedTitleId && (
            <div className="mt-0.5 mb-0.5">
              <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
            </div>
          )}
          <p className="text-sm text-muted-foreground">{rewardSummary.ownedCharacterIds.length}/{CHARACTERS.length} 수집 · {rewardSummary.missionPoints}P</p>
        </div>
        <button
          onClick={() => navigate("/community")}
          className="shrink-0 flex items-center gap-1.5 bg-primary/80 text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:shadow-md transition-all"
        >
          <Pencil className="w-4 h-4" />
          {t("home.write")}
        </button>
      </div>

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/kabemon"
          className="bg-card rounded border border-border p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{t("nav.kabemon")}</p>
            <p className="text-xs text-muted-foreground">{t("home.kabemon_sub")}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>
        <Link
          to="/mypage?titles"
          className="bg-card rounded border border-border p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{t("mypage.title_section")}</p>
            <p className="text-xs text-muted-foreground">{t("home.titles_sub")}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>
      </div>

      {/* ── Feed ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            {t("home.recent_posts")}
          </h3>
          <Link to="/community" className="text-sm text-primary hover:underline">
            {t("home.view_all")}
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="bg-card rounded border border-border p-10 text-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t("home.no_posts")}</p>
            <button
              onClick={() => navigate("/community")}
              className="mt-3 text-sm text-primary hover:underline"
            >
              {t("home.first_post")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => {
              const catColors: Record<string, string> = {
                brag: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                tip: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
                chat: "bg-muted text-muted-foreground",
              };
              return (
                <div
                  key={post.id}
                  className="bg-card rounded border border-border p-4 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/community/${post.id}`)}
                >
                  {/* Author row */}
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar authorId={post.authorId} authorName={post.authorName} photoUrl={post.authorPhotoUrl} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{post.authorName}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${catColors[post.category]}`}>
                          {t(`community.${post.category}` as Parameters<typeof t>[0])}
                        </span>
                      </div>
                      {post.authorEquippedTitleId && (
                        <TitleBadge titleId={post.authorEquippedTitleId} size="xs" />
                      )}
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt, lang)}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex gap-3 items-start mb-3">
                    <p className="text-sm leading-relaxed line-clamp-3 flex-1 min-w-0">
                      {post.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()}
                    </p>
                    {extractFirstImage(post.content) && (
                      <img
                        src={extractFirstImage(post.content)!}
                        alt=""
                        className="w-16 h-16 object-cover rounded-md border border-border shrink-0"
                      />
                    )}
                  </div>

                  {/* Engagement */}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePostLike(post.id); }}
                      className={`flex items-center gap-1 text-xs transition-colors ${post.isLiked ? "text-primary" : "hover:text-primary"}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${post.isLiked ? "fill-current" : ""}`} />
                      {post.likes}
                    </button>
                    {post.commentCount > 0 && (
                      <span className="text-xs flex items-center gap-1">💬 {post.commentCount}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
