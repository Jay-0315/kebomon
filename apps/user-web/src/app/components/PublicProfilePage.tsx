import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Flag, Trophy, Swords, Shield } from "lucide-react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { useLang } from "../context/LangContext";
import { CHARACTERS } from "../data/characters";
import { PixelSprite } from "./PixelCharacter";
import ReportModal from "./ReportModal";
import TitleBadge from "./TitleBadge";
import { BORDER_STYLES, getBorderLayout } from "./ColosseumPage";

interface PublicProfile {
  id: string;
  name: string;
  profilePhoto: string | null;
  bio: string | null;
  favoriteCharacterIds: number[];
  equippedCharacterId: number | null;
  equippedTitleId: number | null;
  equippedBorderId: string | null;
  arena: { tierPoints: number; wins: number; losses: number; bestStreak: number };
  duel: { wins: number; losses: number; bestStreak: number };
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const currentUser = getStoredUser();

  useEffect(() => {
    if (!userId) return;
    setProfile(null);
    setNotFound(false);
    api
      .get<PublicProfile>(`/users/${userId}/public-profile`)
      .then(setProfile)
      .catch(() => setNotFound(true));
  }, [userId]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {ko ? "사용자를 찾을 수 없습니다." : ja ? "ユーザーが見つかりません。" : "User not found."}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {ko ? "뒤로가기" : ja ? "戻る" : "Go back"}
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-muted-foreground">
        {ko ? "불러오는 중…" : ja ? "読み込み中…" : "Loading…"}
      </div>
    );
  }

  const char = profile.equippedCharacterId
    ? (CHARACTERS.find((c) => c.id === profile.equippedCharacterId) ?? null)
    : null;
  const border = profile.equippedBorderId ? BORDER_STYLES[profile.equippedBorderId] : null;
  const AVATAR_SIZE = 84;
  const borderLayout = border ? getBorderLayout(border.image, AVATAR_SIZE) : null;
  const containerW = borderLayout ? borderLayout.frameW : AVATAR_SIZE;
  const containerH = borderLayout ? borderLayout.frameH : AVATAR_SIZE;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          {ko ? "뒤로가기" : ja ? "戻る" : "Back"}
        </button>
        {currentUser && currentUser.id !== profile.id && (
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
          >
            <Flag className="w-4 h-4" />
            {ko ? "신고" : ja ? "報告" : "Report"}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: containerW, height: containerH }}>
            <div
              className="rounded-full border-2 border-primary/40 flex items-center justify-center overflow-hidden bg-primary/10"
              style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                position: borderLayout ? "absolute" : "relative",
                top: borderLayout ? borderLayout.photoTop : undefined,
                left: borderLayout ? borderLayout.photoLeft : undefined,
              }}
            >
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt={profile.name} className="w-full h-full object-cover" />
              ) : char ? (
                <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={AVATAR_SIZE - 8} />
              ) : (
                <span className="text-2xl font-bold text-primary">{profile.name[0]}</span>
              )}
            </div>
            {border && borderLayout && (
              <img
                src={border.image}
                alt=""
                className="absolute inset-0 pointer-events-none"
                style={{ width: borderLayout.frameW, height: borderLayout.frameH, zIndex: 10 }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-foreground truncate">{profile.name}</p>
            {profile.equippedTitleId && <TitleBadge titleId={profile.equippedTitleId} size="sm" />}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              {ko ? "콜로세움" : ja ? "コロシアム" : "Colosseum"}
            </p>
            <p className="text-sm font-bold text-foreground">{profile.arena.tierPoints.toLocaleString()} pts</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile.arena.wins}{ko ? "승" : ja ? "勝" : "W"} {profile.arena.losses}{ko ? "패" : ja ? "敗" : "L"}
              {profile.arena.bestStreak > 1 && (
                <span className="ml-1 text-amber-500 font-semibold">
                  · {ko ? "최고" : ja ? "最高" : "Best"} {profile.arena.bestStreak}{ko ? "연승" : ja ? "連勝" : " streak"}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
              <Swords className="w-3.5 h-3.5 text-primary" />
              {ko ? "듀얼" : ja ? "デュエル" : "Duel"}
            </p>
            <p className="text-sm font-bold text-foreground">
              {profile.duel.wins}{ko ? "승" : ja ? "勝" : "W"} {profile.duel.losses}{ko ? "패" : ja ? "敗" : "L"}
            </p>
            {profile.duel.bestStreak > 1 && (
              <p className="mt-1 text-xs text-primary font-semibold flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {ko ? "최고" : ja ? "最高" : "Best"} {profile.duel.bestStreak}{ko ? "연승" : ja ? "連勝" : " streak"}
              </p>
            )}
          </div>
        </div>

        {profile.favoriteCharacterIds.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {t("mypage.favorites_section")}
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.favoriteCharacterIds.map((id) => {
                const fc = CHARACTERS.find((c) => c.id === id);
                if (!fc) return null;
                return (
                  <div
                    key={id}
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30"
                  >
                    <PixelSprite type={fc.type} colors={fc.colors} characterId={fc.id} rarity={fc.rarity} size={36} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal targetType="USER" targetId={profile.id} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
