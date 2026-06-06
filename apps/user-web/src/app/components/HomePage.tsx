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
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { CHARACTERS } from "../data/characters";
import TitleBadge from "./TitleBadge";

const CHANNEL_DATA = [
  { id: 1, name: "폐허",   desktop: "/bg-ruins.png",  mobile: "/bg-ruins.v.png",  fill: "#1f2a14", border: "#57534e", icon: <Castle   size={16} color="#a8a29e" /> },
  { id: 2, name: "광장",   desktop: "/bg-plaza.png",  mobile: "/bg-plaza-v.png",  fill: "#8a6535", border: "#b45309", icon: <Landmark size={16} color="#b45309" /> },
  { id: 3, name: "해변",   desktop: "/bg-beach.png",  mobile: "/bg-beach-v.png",  fill: "#1a4a6e", border: "#1e6090", icon: <Waves    size={16} color="#38bdf8" /> },
  { id: 4, name: "제단",   desktop: "/bg-camp.png",   mobile: "/bg-camp-v.png",   fill: "#2a3a1a", border: "#3a5a2a", icon: <Flame    size={16} color="#f97316" /> },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { profile, rewardSummary, profilePhoto } = useAppData();
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* ── Profile banner ── */}
      <div className="bg-card rounded border border-border p-5 flex items-center gap-4">
        <div onClick={() => navigate("/mypage")} className="shrink-0 cursor-pointer">
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt={profile.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/40"
            />
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
          <p className="text-sm text-muted-foreground">
            {rewardSummary.ownedCharacterIds.length}/{CHARACTERS.length} 수집 ·{" "}
            {rewardSummary.missionPoints}P
          </p>
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
                    <span className="text-sm font-medium text-white/70">{ch.name}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-white/50">
                    <Users className="h-3.5 w-3.5" />
                    <span>{t("live.enter")}</span>
                  </div>
                </div>
                <div className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-105">
                  {t("live.enter")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
