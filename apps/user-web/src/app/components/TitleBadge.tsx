import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TITLES, TITLE_BY_ID, TITLE_GLOW, TITLE_GRADE_BG, TITLE_GRADE_COLOR } from "../data/titles";
import type { TitleGrade } from "../data/titles";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

interface TitleBadgeProps {
  titleId: number;
  size?: "xs" | "sm" | "md";
  showGrade?: boolean;
}

const MYTHIC_COLORS = ["#FF80AB", "#CE93D8", "#80DEEA", "#FFD54F", "#FF80AB"];

export default function TitleBadge({ titleId, size = "sm", showGrade = false }: TitleBadgeProps) {
  const { t } = useLang();
  const title = TITLE_BY_ID.get(titleId);
  if (!title) return null;

  const { grade } = title;
  const name = t(`title.${titleId}.name` as TranslationKey);
  const isMythic = grade === "mythic";

  const fontSizeClass = size === "xs" ? "text-[10px]" : size === "sm" ? "text-xs" : "text-sm";
  const paddingClass = size === "xs" ? "px-1 py-px" : size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";

  const baseStyle: React.CSSProperties = {
    backgroundColor: TITLE_GRADE_BG[grade],
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    gap: size === "xs" ? "2px" : "4px",
    fontWeight: 700,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap" as const,
  };

  const textStyle: React.CSSProperties = isMythic
    ? {
        background: `linear-gradient(90deg, ${MYTHIC_COLORS.join(", ")})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
        filter: "drop-shadow(0 0 6px rgba(255,128,171,0.9)) drop-shadow(0 0 12px rgba(206,147,216,0.6))",
      }
    : {
        color: TITLE_GRADE_COLOR[grade],
        textShadow: TITLE_GLOW[grade],
      };

  return (
    <span style={baseStyle} className={`${fontSizeClass} ${paddingClass}`}>
      {isMythic ? (
        <MythicAnimatedText text={name} size={size} />
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

// 인라인 keyframes는 global CSS에서 정의 필요 - index.css에 추가 필요
// @keyframes titleShimmer { to { background-position: 200% center; } }

// 칭호 선택 그리드 - MyPage / KabemonPage 내에서 사용
export function TitleSelector({
  ownedTitleIds,
  equippedTitleId,
  onEquip,
  onUnequip,
  loading,
}: {
  ownedTitleIds: number[];
  equippedTitleId: number | null;
  onEquip: (id: number) => void;
  onUnequip: () => void;
  loading?: boolean;
}) {
  const { t } = useLang();
  const ownedSet = new Set(ownedTitleIds);

  const gradeOrder: TitleGrade[] = ["common", "rare", "epic", "legendary", "mythic"];
  const byGrade = gradeOrder.map((grade) => ({
    grade,
    titles: TITLES.filter((tt) => tt.grade === grade),
  }));

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
                  return (
                    <div
                      key={title.id}
                      className={`flex items-center justify-between p-2.5 transition-all ${
                        isEquipped
                          ? "bg-primary/5"
                          : isOwned
                          ? "bg-card hover:bg-muted/50"
                          : "bg-muted/20 opacity-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isOwned ? (
                          <TitleBadge titleId={title.id} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded">
                            ???
                          </span>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate">{t(`title.${title.id}.desc` as TranslationKey)}</p>
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
                        <span className="shrink-0 text-[10px] font-semibold text-primary">✓ {t("kabemon.equipped")}</span>
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
