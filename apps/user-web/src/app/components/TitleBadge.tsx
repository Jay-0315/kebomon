import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { TITLES, TITLE_BY_ID, TITLE_GLOW, TITLE_GRADE_BG, TITLE_GRADE_COLOR } from "../data/titles";
import type { TitleGrade } from "../data/titles";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

interface TitleBadgeProps {
  titleId: number;
  size?: "xs" | "sm" | "md";
  showGrade?: boolean;
}


export default function TitleBadge({ titleId, size = "sm", showGrade = false }: TitleBadgeProps) {
  const { t } = useLang();
  const title = TITLE_BY_ID.get(titleId);
  if (!title) return null;

  const { grade, variant } = title;
  const name = t(`title.${titleId}.name` as TranslationKey);
  const isMythic = grade === "mythic";
  const isLimited = grade === "limited";
  const isSeasonNeon = isLimited && variant === "season_neon";
  const isSeasonFire = isLimited && variant === "season_fire";

  const fontSizeClass = size === "xs" ? "text-[10px]" : size === "sm" ? "text-xs" : "text-sm";
  const paddingClass = size === "xs" ? "px-1 py-px" : size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  const baseStyle: React.CSSProperties = {
    backgroundColor: isSeasonNeon
      ? "rgba(0,20,50,0.88)"
      : isSeasonFire
      ? "rgba(30,10,0,0.88)"
      : TITLE_GRADE_BG[grade],
    borderRadius: "4px",
    border: isSeasonNeon
      ? "1.5px solid rgba(0,160,255,0.45)"
      : isSeasonFire
      ? "1.5px solid rgba(255,60,0,0.6)"
      : isLimited
      ? "1.5px solid rgba(180,120,0,0.55)"
      : undefined,
    display: "inline-flex",
    alignItems: "center",
    gap: size === "xs" ? "2px" : "4px",
    fontWeight: 700,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap" as const,
  };

  const textStyle: React.CSSProperties = {
    color: TITLE_GRADE_COLOR[grade],
    textShadow: TITLE_GLOW[grade],
  };

  return (
    <span style={baseStyle} className={`${fontSizeClass} ${paddingClass}`}>
      {isMythic ? (
        <MythicAnimatedText text={name} size={size} />
      ) : isSeasonNeon ? (
        <SeasonNeonText text={name} size={size} />
      ) : isSeasonFire ? (
        <SeasonFireText text={name} size={size} />
      ) : isLimited ? (
        <LimitedAnimatedText text={name} size={size} />
      ) : (
        <span style={textStyle}>{name}</span>
      )}
      {showGrade && (
        <span style={{ color: TITLE_GRADE_COLOR[grade], opacity: 0.7, fontSize: "0.75em" }}>
          [{t(`title.grade.${grade}` as TranslationKey)}]
        </span>
      )}
    </span>
  );
}

// 신화 등급: CSS 애니메이션 shimmer 효과
function MythicAnimatedText({ text, size }: { text: string; size: "xs" | "sm" | "md" }) {
  const fontSize = size === "xs" ? "10px" : size === "sm" ? "12px" : "14px";
  return (
    <span
      style={{
        fontSize,
        fontWeight: 700,
        background: "linear-gradient(90deg, #FF80AB 0%, #CE93D8 25%, #80DEEA 50%, #FFD54F 75%, #FF80AB 100%)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        animation: "titleShimmer 3s linear infinite",
        filter: "drop-shadow(0 0 4px rgba(255,128,171,0.8))",
      }}
    >
      {text}
    </span>
  );
}

// 한정 등급: 카제로스 스타일 — 어비스 어둠 속에서 황금 에너지가 흐르고 붉은 카오스 글로우가 맥동
function LimitedAnimatedText({ text, size }: { text: string; size: "xs" | "sm" | "md" }) {
  const fontSize = size === "xs" ? "10px" : size === "sm" ? "12px" : "14px";
  return (
    <span
      style={{
        fontSize,
        fontWeight: 700,
        background: "linear-gradient(90deg, #0d001a, #4a0040, #8B0000, #C8920A, #FFD700, #FFF5C3, #FFD700, #C8920A, #8B0000, #4a0040, #0d001a)",
        backgroundSize: "300% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        animation: "limitedGold 5s linear infinite, limitedAura 2.8s ease-in-out infinite",
      }}
    >
      {text}
    </span>
  );
}

// 시즌2 한정 칭호: 진한 불꽃 스타일 (빨강→주황→노랑→흰빛)
function SeasonFireText({ text, size }: { text: string; size: "xs" | "sm" | "md" }) {
  const fontSize = size === "xs" ? "10px" : size === "sm" ? "12px" : "14px";
  return (
    <span
      style={{
        fontSize,
        fontWeight: 700,
        background: "linear-gradient(90deg, #ff2200, #ff6600, #ffaa00, #ffdd00, #ffffff, #ffdd00, #ffaa00, #ff6600, #ff2200)",
        backgroundSize: "300% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        animation: "seasonFireShimmer 4s linear infinite, seasonFireGlow 2.4s ease-in-out infinite",
      }}
    >
      {text}
    </span>
  );
}

// 시즌1 한정 칭호: 파란 네온 글로우 스타일
function SeasonNeonText({ text, size }: { text: string; size: "xs" | "sm" | "md" }) {
  const fontSize = size === "xs" ? "10px" : size === "sm" ? "12px" : "14px";
  return (
    <span
      style={{
        fontSize,
        fontWeight: 700,
        background: "linear-gradient(90deg, #001a40, #0060c0, #00b4ff, #c0e8ff, #ffffff, #c0e8ff, #00b4ff, #0060c0, #001a40)",
        backgroundSize: "300% auto",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        animation: "seasonNeonShimmer 4s linear infinite, seasonNeonGlow 2.4s ease-in-out infinite",
      }}
    >
      {text}
    </span>
  );
}

// 인라인 keyframes는 global CSS에서 정의 필요 - index.css에 추가 필요
// @keyframes titleShimmer { to { background-position: 200% center; } }

// 칭호 선택 그리드 - MyPage / KebomonPage 내에서 사용
export type TitleUserStats = {
  raid_count?: number;
  attendance?: number;
  streak?: number;
  post_count?: number;
  points?: number;
  col_wins?: number;
  col_streak?: number;
  col_points?: number;
  rogue_clears?: number;
  expedition_count?: number;
};

const CONDITION_UNIT: Record<string, string> = {
  raid_count: "회",
  attendance: "일",
  streak: "일",
  post_count: "개",
  points: "P",
  col_wins: "승",
  col_streak: "연승",
  col_points: "pts",
  rogue_clears: "회",
  expedition_count: "회",
};

export function TitleSelector({
  ownedTitleIds,
  equippedTitleId,
  onEquip,
  onUnequip,
  loading,
  userStats,
}: {
  ownedTitleIds: number[];
  equippedTitleId: number | null;
  onEquip: (id: number) => void;
  onUnequip: () => void;
  loading?: boolean;
  userStats?: TitleUserStats;
}) {
  const { t } = useLang();
  const ownedSet = new Set(ownedTitleIds);

  const gradeOrder: TitleGrade[] = ["common", "rare", "epic", "legendary", "mythic", "limited"];
  const byGrade = gradeOrder.map((grade) => ({
    grade,
    titles: TITLES.filter((tt) => tt.grade === grade && (!tt.hidden || ownedSet.has(tt.id))),
  })).filter(({ titles }) => titles.length > 0);

  const [openGrades, setOpenGrades] = useState<Set<TitleGrade>>(new Set(gradeOrder));
  const toggleGrade = (grade: TitleGrade) =>
    setOpenGrades((prev) => { const s = new Set(prev); s.has(grade) ? s.delete(grade) : s.add(grade); return s; });

  return (
    <div className="space-y-2">
      {equippedTitleId && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("mypage.title_equipped_label")}</p>
            <TitleBadge titleId={equippedTitleId} size="md" />
          </div>
          <button
            onClick={onUnequip}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            {t("mypage.title_unequip")}
          </button>
        </div>
      )}

      {byGrade.map(({ grade, titles }) => {
        const isOpen = openGrades.has(grade);
        const ownedCount = titles.filter((tt) => ownedSet.has(tt.id)).length;
        return (
          <div key={grade} className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleGrade(grade)}
              className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <p className="text-xs font-semibold" style={{ color: TITLE_GRADE_COLOR[grade] }}>
                {t(`title.grade.${grade}` as TranslationKey)} {t("mypage.title_section")}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{ownedCount}/{titles.length}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
              </div>
            </button>
            {isOpen && (
              <div className="divide-y divide-border/50">
                {titles.map((title) => {
                  const isOwned = ownedSet.has(title.id);
                  const isEquipped = title.id === equippedTitleId;
                  const current = userStats?.[title.conditionType as keyof TitleUserStats] ?? 0;
                  const required = title.conditionValue;
                  const progress = Math.min(current / required, 1);
                  const unit = CONDITION_UNIT[title.conditionType] ?? "";
                  return (
                    <div
                      key={title.id}
                      className={`flex items-center justify-between p-2.5 transition-all ${
                        isEquipped
                          ? "bg-primary/5"
                          : isOwned
                          ? "bg-card hover:bg-muted/50"
                          : "bg-muted/20"
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 mb-1">
                          {isOwned ? (
                            <TitleBadge titleId={title.id} size="sm" />
                          ) : (
                            <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded">
                              ???
                            </span>
                          )}
                          <p className="text-[10px] text-muted-foreground truncate">{t(`title.${title.id}.desc` as TranslationKey)}</p>
                        </div>
                        {/* 진행률 바 */}
                        {!isOwned && userStats && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progress * 100}%`,
                                  background: TITLE_GRADE_COLOR[grade],
                                  opacity: 0.8,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {current.toLocaleString()}/{required.toLocaleString()}{unit}
                            </span>
                          </div>
                        )}
                      </div>
                      {isOwned && !isEquipped && (
                        <button
                          onClick={() => onEquip(title.id)}
                          disabled={loading}
                          className="shrink-0 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {t("mypage.title_equip")}
                        </button>
                      )}
                      {isEquipped && (
                        <span className="shrink-0 text-[10px] font-semibold text-primary flex items-center gap-0.5"><Check className="w-2.5 h-2.5" />{t("kebomon.equipped")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
