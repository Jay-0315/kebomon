import { useNavigate, Link } from "react-router";
import {
  Pencil,
  ChevronRight,
  TrendingUp,
  Award,
  Castle,
  Landmark,
  Waves,
  Flame,
  Radio,
  Users,
  HelpCircle,
  X,
  CalendarCheck,
  Repeat2,
  FileText,
  Sword,
  Map,
  Layers,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { TranslationKey } from "../lib/i18n";
import { CHARACTERS } from "../data/characters";
import TitleBadge from "./TitleBadge";
import StatusPanel from "./StatusPanel";
import UserAvatar from "./UserAvatar";
import DailyQuestCard from "./DailyQuestCard";
import BannerSlot from "./BannerSlot";

const CHANNEL_DATA = [
  { id: 1, nameKey: "live.channel.1" as TranslationKey, desktop: "/bg-ruins.png",  mobile: "/bg-ruins.v.png",  fill: "#1f2a14", border: "#57534e", icon: <Castle   size={16} color="#a8a29e" /> },
  { id: 2, nameKey: "live.channel.2" as TranslationKey, desktop: "/bg-plaza.png",  mobile: "/bg-plaza-v.png",  fill: "#8a6535", border: "#b45309", icon: <Landmark size={16} color="#b45309" /> },
  { id: 3, nameKey: "live.channel.3" as TranslationKey, desktop: "/bg-beach.png",  mobile: "/bg-beach-v.png",  fill: "#1a4a6e", border: "#1e6090", icon: <Waves    size={16} color="#38bdf8" /> },
  { id: 4, nameKey: "live.channel.4" as TranslationKey, desktop: "/bg-camp.png",   mobile: "/bg-camp-v.png",   fill: "#2a3a1a", border: "#3a5a2a", icon: <Flame    size={16} color="#f97316" /> },
];

const EARN_ROWS = [
  { icon: CalendarCheck, color: "#22c55e", labelKey: "home.point_guide_attendance" as TranslationKey, descKey: "home.point_guide_attendance_desc" as TranslationKey },
  { icon: Repeat2,       color: "#3b82f6", labelKey: "home.point_guide_streak"     as TranslationKey, descKey: "home.point_guide_streak_desc"     as TranslationKey },
  { icon: FileText,      color: "#f59e0b", labelKey: "home.point_guide_post"       as TranslationKey, descKey: "home.point_guide_post_desc"       as TranslationKey },
  { icon: Sword,         color: "#ef4444", labelKey: "home.point_guide_raid"       as TranslationKey, descKey: "home.point_guide_raid_desc"       as TranslationKey },
  { icon: Map,           color: "#8b5cf6", labelKey: "home.point_guide_expedition" as TranslationKey, descKey: "home.point_guide_expedition_desc" as TranslationKey },
  { icon: Layers,        color: "#a855f7", labelKey: "home.point_guide_rogue"       as TranslationKey, descKey: "home.point_guide_rogue_desc"       as TranslationKey },
];

function PointGuideModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{t("home.point_guide_title")}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Earn section */}
        <div className="px-5 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("home.point_guide_earn")}
          </p>
          <div className="space-y-2">
            {EARN_ROWS.map(({ icon: Icon, color, labelKey, descKey }) => (
              <div key={labelKey} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium truncate">{t(labelKey)}</span>
                  <span className="text-xs text-muted-foreground shrink-0 text-right">{t(descKey)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-border" />

        {/* Use section */}
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("home.point_guide_use")}
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "#f59e0b22", border: "1px solid #f59e0b44" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{t("home.point_guide_gacha")}</span>
              <span className="text-xs text-muted-foreground shrink-0">{t("home.point_guide_gacha_desc")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { profile, rewardSummary, profilePhoto } = useAppData();
  const { t } = useLang();
  const [showPointGuide, setShowPointGuide] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {showPointGuide && <PointGuideModal onClose={() => setShowPointGuide(false)} />}

      {/* ── 공지/이벤트 배너 ── */}
      <BannerSlot />

      {/* ── Profile banner ── */}
      <div className="bg-card rounded border border-border p-5 flex items-center gap-4">
        <div onClick={() => navigate("/mypage")} className="shrink-0 cursor-pointer">
          <UserAvatar
            authorId={profile.id}
            authorName={profile.name}
            size="lg"
            photoUrl={profilePhoto}
            borderId={rewardSummary.equippedBorderId ?? null}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{profile.name}</p>
          {rewardSummary.equippedTitleId && (
            <div className="mt-0.5 mb-0.5">
              <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {rewardSummary.ownedCharacterIds.length}/{CHARACTERS.length} {t("kebomon.collection_count")} ·{" "}
            {rewardSummary.missionPoints}KP
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => setShowPointGuide(true)}
            className="flex items-center gap-1.5 border border-border rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t("home.point_guide")}</span>
          </button>
          <button
            onClick={() => navigate("/community")}
            className="flex items-center gap-1.5 bg-primary/80 text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:shadow-md transition-all"
          >
            <Pencil className="w-4 h-4" />
            {t("home.write")}
          </button>
        </div>
      </div>

      {/* ── 일일 퀘스트 ── */}
      <DailyQuestCard />

      {/* ── Quick links ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/kebomon"
          className="bg-card rounded border border-border p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
        >
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{t("nav.kebomon")}</p>
            <p className="text-xs text-muted-foreground">{t("home.kebomon_sub")}</p>
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

      {/* ── Live channels ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">{t("live.title")}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CHANNEL_DATA.map((ch) => (
            <button
              key={ch.id}
              onClick={() => navigate("/live", { state: { channelId: ch.id } })}
              className="group relative flex overflow-hidden rounded-2xl border text-left transition-all hover:shadow-lg"
              style={{ borderColor: ch.border, background: "transparent" }}
            >
              <div className="absolute inset-0" style={{ backgroundColor: ch.fill }} />
              <picture>
                <source media="(max-width: 768px)" srcSet={ch.mobile} />
                <img
                  src={ch.desktop}
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ imageRendering: "pixelated" }}
                  alt="" aria-hidden
                />
              </picture>
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative flex w-full items-center justify-between p-5">
                <div>
                  <div className="flex items-center gap-2 text-lg font-bold text-white drop-shadow">
                    <span>{ch.icon}</span>
                    ch.{ch.id}
                    <span className="text-sm font-medium text-white/70">{t(ch.nameKey)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-white/50">
                    <Users className="h-3.5 w-3.5" />
                    <span>{t("live.enter")}</span>
                  </div>
                </div>
                <div className="hidden sm:block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-105">
                  {t("live.enter")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Status panel ── */}
      <StatusPanel />
    </div>
  );
}
