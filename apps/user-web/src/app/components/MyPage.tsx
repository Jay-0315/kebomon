import { useRef, useState } from "react";
import {
  Flame,
  Heart,
  Camera,
  X,
  Pencil,
  Check,
  Gamepad2,
  ChevronRight,
  Award,
  CalendarCheck,
  Zap,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import PixelCharacter from "./PixelCharacter";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { getCountryByCode } from "../data/currency";
import {
  CHARACTERS,
  RARITY_COLOR,
  getCharName,
  getRarityLabel,
} from "../data/characters";
import TitleBadge, { TitleSelector } from "./TitleBadge";
import { MessageCircle } from "lucide-react";

export default function MyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile,
    rewardSummary,
    posts,
    profilePhoto,
    updateProfilePhoto,
    updateProfileName,
    equipTitle,
    unequipTitle,
  } = useAppData();
  const [titleLoading, setTitleLoading] = useState(false);
  const [showTitleSelector, setShowTitleSelector] = useState(() =>
    new URLSearchParams(location.search).has("titles"),
  );

  const handleEquipTitle = async (id: number) => {
    setTitleLoading(true);
    try {
      await equipTitle(id);
    } finally {
      setTitleLoading(false);
    }
  };
  const handleUnequipTitle = async () => {
    setTitleLoading(true);
    try {
      await unequipTitle();
    } finally {
      setTitleLoading(false);
    }
  };
  const { t, lang } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  const handleSaveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === profile.name) {
      setEditingName(false);
      return;
    }
    await updateProfileName(trimmed);
    setEditingName(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") updateProfilePhoto(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const myPosts = posts.filter((post) => post.authorId === profile.id);
  const country = getCountryByCode(profile.baseCountryCode);

  const ownedSet = new Set(rewardSummary.ownedCharacterIds);
  const displayChar = rewardSummary.equippedCharacterId
    ? (CHARACTERS.find((c) => c.id === rewardSummary.equippedCharacterId) ??
      CHARACTERS.find((c) => ownedSet.has(c.id)) ??
      CHARACTERS[0])
    : (CHARACTERS.find((c) => ownedSet.has(c.id)) ?? CHARACTERS[0]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Profile header ── */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full border-2 border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-primary/10"
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {profile.name[0]}
              </span>
            )}
          </div>
          {profilePhoto && (
            <button
              onClick={() => updateProfilePhoto(null)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:bg-destructive/80 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors"
          >
            <Camera className="w-3 h-3" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h2>{t("mypage.title")}</h2>
          {editingName ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                autoFocus
                maxLength={20}
                className="text-sm px-2 py-0.5 rounded border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring w-32"
              />
              <button
                onClick={() => void handleSaveName()}
                className="text-primary hover:text-primary/70 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-medium truncate">
                {profile.name}
              </span>
              <button
                onClick={() => {
                  setDraftName(profile.name);
                  setEditingName(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {country.flag} {country.name}
          </p>
        </div>
      </div>

      {/* ── 케보몬 shortcut card ── */}
      <button
        onClick={() => navigate("/kabemon")}
        className="w-full bg-card rounded-md border-2 border-primary/50 hover:border-primary p-4 transition-all hover:shadow-md group flex items-center gap-4 text-left"
      >
        <div className="shrink-0">
          <PixelCharacter characterId={displayChar.id} size={64} float />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {t("mypage.kabemon_link")}
            </span>
          </div>
          <p
            className={`text-sm font-medium ${RARITY_COLOR[displayChar.rarity]}`}
          >
            {getCharName(displayChar, lang)}
          </p>
          <p className="text-xs text-muted-foreground">
            {getRarityLabel(displayChar.rarity, lang)} ·{" "}
            {rewardSummary.ownedCharacterIds.length}/{CHARACTERS.length}{" "}
            {t("kabemon.collection_count")} · {rewardSummary.missionPoints}P
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </button>

      {/* ── 칭호 ── */}
      <div className="bg-card rounded-md p-4 shadow-sm border border-border">
        <button
          onClick={() => setShowTitleSelector((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {t("mypage.title_section")}
            </span>
            {rewardSummary.equippedTitleId && (
              <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              {rewardSummary.ownedTitleIds.length}
              {t("mypage.title_owned")}
            </span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${showTitleSelector ? "rotate-90" : ""}`}
            />
          </div>
        </button>
        {showTitleSelector && (
          <div className="mt-3 pt-3 border-t border-border">
            <TitleSelector
              ownedTitleIds={rewardSummary.ownedTitleIds}
              equippedTitleId={rewardSummary.equippedTitleId}
              onEquip={handleEquipTitle}
              onUnequip={handleUnequipTitle}
              loading={titleLoading}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 활동 현황 ── */}
        <div className="bg-card rounded-md p-5 shadow-sm border border-border">
          <h3 className="mb-4 flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent" />
            {t("mypage.monthly_summary")}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted rounded p-3 text-center">
              <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {t("mypage.current_points")}
              </p>
              <p className="text-lg font-bold text-primary">
                {rewardSummary.missionPoints}P
              </p>
            </div>
            <div className="bg-muted rounded p-3 text-center">
              <CalendarCheck className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {t("kabemon.attendance")}
              </p>
              <p className="text-lg font-bold">
                {rewardSummary.attendanceDays}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("kabemon.days")}
                </span>
              </p>
            </div>
            <div className="bg-muted rounded p-3 text-center">
              <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {t("kabemon.streak")}
              </p>
              <p className="text-lg font-bold">
                {rewardSummary.streakDays}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("kabemon.days")}
                </span>
              </p>
            </div>
            <div className="bg-muted rounded p-3 text-center">
              <Gamepad2 className="w-4 h-4 text-primary/70 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {t("kabemon.collection_count")}
              </p>
              <p className="text-lg font-bold">
                {rewardSummary.ownedCharacterIds.length}
                <span className="text-sm font-normal text-muted-foreground">
                  /{CHARACTERS.length}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── 내가 작성한 게시글 ── */}
        <div className="bg-card rounded-md p-5 shadow-sm border border-border">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary/80" />
              {t("mypage.my_posts")}
            </h3>
            <button
              onClick={() => navigate(`/community/my?userId=${profile.id}`)}
              className="text-xs text-primary hover:underline"
            >
              {t("home.view_all")}
            </button>
          </div>
          <div className="space-y-2">
            {myPosts.length === 0 ? (
              <div className="p-4 rounded bg-muted text-sm text-muted-foreground">
                {t("mypage.no_posts")}
              </div>
            ) : (
              myPosts.slice(0, 5).map((post) => (
                <button
                  key={post.id}
                  onClick={() => navigate(`/community/${post.id}`)}
                  className="w-full p-3 rounded bg-muted hover:bg-accent/30 transition-colors text-left"
                >
                  <p className="font-medium truncate text-sm">
                    {post.content.replace(/<[^>]*>/g, "").trim() ||
                      "(내용 없음)"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post.commentCount} · {t("mypage.post_likes_prefix")}
                    {post.likes}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
