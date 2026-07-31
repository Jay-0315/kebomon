import { useRef, useState, useEffect } from "react";
import { api } from "../lib/api";
import type { TitleUserStats } from "./TitleBadge";
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
  Layers,
  Star,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import PixelCharacter from "./PixelCharacter";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { getCountryByCode } from "../data/currency";
import { compressImage } from "../lib/image";
import {
  CHARACTERS,
  RARITY_COLOR,
  getCharName,
  getRarityLabel,
} from "../data/characters";
import TitleBadge, { TitleSelector } from "./TitleBadge";
import { MessageCircle } from "lucide-react";
import { BORDER_STYLES, BORDER_NAMES } from "./ColosseumPage";

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
    updateBio,
    updateFavoriteCharacters,
    equipTitle,
    unequipTitle,
    equipBorder,
    unequipBorder,
  } = useAppData();
  const [titleLoading, setTitleLoading] = useState(false);
  const [showTitleSelector, setShowTitleSelector] = useState(() =>
    new URLSearchParams(location.search).has("titles"),
  );
  const [showBorderSelector, setShowBorderSelector] = useState(false);
  const [borderLoading, setBorderLoading] = useState(false);
  const [titleStats, setTitleStats] = useState<TitleUserStats>({});

  useEffect(() => {
    api
      .get<{
        tierPoints: number;
        wins: number;
        winStreak: number;
        bestStreak: number;
        postCount: number;
      }>(`/rewards/colosseum-stats?userId=${encodeURIComponent(profile.id)}`)
      .then((s) => {
        setTitleStats({
          raid_count: rewardSummary.raidCount,
          attendance: rewardSummary.attendanceDays,
          streak: rewardSummary.streakDays,
          post_count: s.postCount,
          points: rewardSummary.totalPointsUsed,
          col_wins: s.wins,
          col_streak: s.bestStreak,
          col_points: s.tierPoints,
          rogue_clears: rewardSummary.rogueClears,
          expedition_count: rewardSummary.expeditionCount,
        });
      })
      .catch(() => {
        setTitleStats({
          raid_count: rewardSummary.raidCount,
          attendance: rewardSummary.attendanceDays,
          streak: rewardSummary.streakDays,
          points: rewardSummary.totalPointsUsed,
          rogue_clears: rewardSummary.rogueClears,
          expedition_count: rewardSummary.expeditionCount,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleEquipBorder = async (borderId: string) => {
    setBorderLoading(true);
    try {
      await equipBorder(borderId);
    } finally {
      setBorderLoading(false);
    }
  };
  const handleUnequipBorder = async () => {
    setBorderLoading(true);
    try {
      await unequipBorder();
    } finally {
      setBorderLoading(false);
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

  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState(profile.bio ?? "");

  const handleSaveBio = async () => {
    const trimmed = draftBio.trim();
    if (trimmed !== (profile.bio ?? "")) {
      await updateBio(trimmed);
    }
    setEditingBio(false);
  };

  const [showFavoriteSelector, setShowFavoriteSelector] = useState(false);
  const MAX_FAVORITES = 6;
  const favoriteIds = profile.favoriteCharacterIds ?? [];

  const toggleFavorite = (characterId: number) => {
    const isFav = favoriteIds.includes(characterId);
    if (!isFav && favoriteIds.length >= MAX_FAVORITES) return;
    const next = isFav
      ? favoriteIds.filter((id) => id !== characterId)
      : [...favoriteIds, characterId];
    void updateFavoriteCharacters(next);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      updateProfilePhoto(compressed);
    } catch {
      // 압축/읽기 실패 시 조용히 무시 — 사진은 변경되지 않음
    }
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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── Profile header ── */}
      <div className="flex items-center gap-4">
        {(() => {
          const equippedBorder = rewardSummary.equippedBorderId
            ? BORDER_STYLES[rewardSummary.equippedBorderId]
            : null;
          // 프레임 이미지의 투명 구멍이 캔버스의 절반 정도만 차지해서, 사진을 너무 작게
          // 잡으면(FRAME_PAD가 크면) 사진과 링 사이에 배경색 틈이 보인다 — 실측해서 보정.
          const FRAME_PAD = 4;
          const PHOTO_SIZE = 76;
          const containerSize = equippedBorder
            ? PHOTO_SIZE + FRAME_PAD * 2
            : PHOTO_SIZE;
          return (
            <div
              className="relative shrink-0"
              style={{ width: containerSize, height: containerSize }}
            >
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border-2 border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-primary/10"
                style={{
                  width: PHOTO_SIZE,
                  height: PHOTO_SIZE,
                  position: equippedBorder ? "absolute" : "relative",
                  top: equippedBorder ? FRAME_PAD : undefined,
                  left: equippedBorder ? FRAME_PAD : undefined,
                }}
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
              {equippedBorder && (
                <img
                  src={equippedBorder.image}
                  alt=""
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ objectFit: "contain", zIndex: 10 }}
                />
              )}
              {profilePhoto && (
                <button
                  onClick={() => updateProfilePhoto(null)}
                  className="absolute w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:bg-destructive/80 transition-colors"
                  style={{
                    top: equippedBorder ? FRAME_PAD - 4 : -4,
                    right: equippedBorder ? FRAME_PAD - 4 : -4,
                    zIndex: 20,
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors"
                style={{
                  bottom: equippedBorder ? FRAME_PAD - 4 : -4,
                  right: equippedBorder ? FRAME_PAD - 4 : -4,
                  zIndex: 20,
                }}
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
          );
        })()}

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
          {editingBio ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <input
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveBio();
                  if (e.key === "Escape") setEditingBio(false);
                }}
                autoFocus
                maxLength={200}
                placeholder={t("mypage.bio_placeholder")}
                className="text-xs px-2 py-1 rounded border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring flex-1 min-w-0"
              />
              <button
                onClick={() => void handleSaveBio()}
                className="text-primary hover:text-primary/70 transition-colors shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditingBio(false)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1.5">
              <p className="text-xs text-muted-foreground truncate">
                {profile.bio || t("mypage.bio_placeholder")}
              </p>
              <button
                onClick={() => {
                  setDraftBio(profile.bio ?? "");
                  setEditingBio(true);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 케보몬 shortcut card ── */}
      <button
        onClick={() => navigate("/kebomon")}
        className="w-full bg-card rounded-md border-2 border-primary/50 hover:border-primary p-4 transition-all hover:shadow-md group flex items-center gap-4 text-left"
      >
        <div className="shrink-0">
          <PixelCharacter characterId={displayChar.id} size={64} float />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {t("mypage.kebomon_link")}
            </span>
          </div>
          <p
            className={`text-sm font-medium ${RARITY_COLOR[displayChar.rarity]}`}
          >
            {getCharName(displayChar, lang)}
            {(rewardSummary.characterEnhancements[displayChar.id] ?? 0) > 0 && (
              <span className="text-amber-400 ml-1">
                +{rewardSummary.characterEnhancements[displayChar.id]}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {getRarityLabel(displayChar.rarity, lang)} ·{" "}
            {rewardSummary.ownedCharacterIds.length}/{CHARACTERS.length}{" "}
            {t("kebomon.collection_count")} · {rewardSummary.missionPoints}KP
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
              userStats={titleStats}
            />
          </div>
        )}
      </div>

      {/* ── 테두리 ── */}
      <div className="bg-card rounded-md p-4 shadow-sm border border-border">
        <button
          onClick={() => setShowBorderSelector((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("mypage.border")}</span>
            {rewardSummary.equippedBorderId &&
              BORDER_STYLES[rewardSummary.equippedBorderId] && (
                <img
                  src={BORDER_STYLES[rewardSummary.equippedBorderId].image}
                  alt=""
                  className="w-6 h-6 object-contain"
                />
              )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              {rewardSummary.ownedBorderIds.length}
              {t("mypage.title_owned")}
            </span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${showBorderSelector ? "rotate-90" : ""}`}
            />
          </div>
        </button>
        {showBorderSelector && (
          <div className="mt-3 pt-3 border-t border-border">
            {rewardSummary.ownedBorderIds.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("mypage.no_borders")}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {rewardSummary.ownedBorderIds.map((bId) => {
                  const bs = BORDER_STYLES[bId];
                  if (!bs) return null;
                  const name = BORDER_NAMES[bId];
                  const isEquipped = rewardSummary.equippedBorderId === bId;
                  const label = name
                    ? lang === "ja"
                      ? name.ja
                      : lang === "ko"
                        ? name.ko
                        : name.en
                    : bId;
                  return (
                    <button
                      key={bId}
                      disabled={borderLoading}
                      onClick={() =>
                        isEquipped
                          ? void handleUnequipBorder()
                          : void handleEquipBorder(bId)
                      }
                      className={`flex flex-col items-center gap-1 p-2 rounded border-2 transition-colors ${
                        isEquipped
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={bs.image}
                        alt={label}
                        className="w-12 h-12 object-contain"
                      />
                      <span className="text-xs font-medium truncate w-full text-center">
                        {label}
                      </span>
                      {isEquipped && (
                        <span className="text-[10px] text-primary">
                          {t("kebomon.equipped")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 즐겨찾기 캐릭터 ── */}
      <div className="bg-card rounded-md p-4 shadow-sm border border-border">
        <button
          onClick={() => setShowFavoriteSelector((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("mypage.favorites_section")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{favoriteIds.length}/{MAX_FAVORITES}</span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${showFavoriteSelector ? "rotate-90" : ""}`}
            />
          </div>
        </button>
        {!showFavoriteSelector && favoriteIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {favoriteIds.map((id) => (
              <PixelCharacter key={id} characterId={id} size={40} />
            ))}
          </div>
        )}
        {showFavoriteSelector && (
          <div className="mt-3 pt-3 border-t border-border">
            {rewardSummary.ownedCharacterIds.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t("mypage.favorites_empty")}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("mypage.favorites_hint")}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {rewardSummary.ownedCharacterIds.map((id) => {
                    const isFav = favoriteIds.includes(id);
                    const char = CHARACTERS.find((c) => c.id === id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleFavorite(id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded border-2 transition-colors ${
                          isFav
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <PixelCharacter characterId={id} size={36} />
                        {char && (
                          <span
                            className={`text-[10px] font-medium truncate w-full text-center ${RARITY_COLOR[char.rarity]}`}
                          >
                            {getCharName(char, lang)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
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
                {rewardSummary.missionPoints}KP
              </p>
            </div>
            <div className="bg-muted rounded p-3 text-center">
              <CalendarCheck className="w-4 h-4 text-accent mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {t("kebomon.attendance")}
              </p>
              <p className="text-lg font-bold">
                {rewardSummary.attendanceDays}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("kebomon.days")}
                </span>
              </p>
            </div>
            <div className="bg-muted rounded p-3 text-center">
              <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {t("kebomon.streak")}
              </p>
              <p className="text-lg font-bold">
                {rewardSummary.streakDays}
                <span className="text-sm font-normal text-muted-foreground">
                  {t("kebomon.days")}
                </span>
              </p>
            </div>
            <div className="bg-muted rounded p-3 text-center">
              <Gamepad2 className="w-4 h-4 text-primary/70 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {t("kebomon.collection_count")}
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
