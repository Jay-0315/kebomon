import { useEffect, useState } from "react";
import { CalendarCheck, Sparkles, Swords, Newspaper, Gift, Check } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

const QUEST_ROWS: { key: string; icon: React.ElementType; labelKey: TranslationKey }[] = [
  { key: "login", icon: CalendarCheck, labelKey: "quest.login" },
  { key: "gacha", icon: Sparkles, labelKey: "quest.gacha" },
  { key: "battle", icon: Swords, labelKey: "quest.battle" },
  { key: "community", icon: Newspaper, labelKey: "quest.community" },
];

export default function DailyQuestCard() {
  const { dailyQuests, fetchDailyQuests, claimDailyQuestBonus } = useAppData();
  const { t, lang } = useLang();
  const [claiming, setClaiming] = useState(false);
  const [claimedPulse, setClaimedPulse] = useState(false);

  useEffect(() => {
    void fetchDailyQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await claimDailyQuestBonus();
      setClaimedPulse(true);
      window.setTimeout(() => setClaimedPulse(false), 1800);
    } finally {
      setClaiming(false);
    }
  };

  if (!dailyQuests) return null;

  return (
    <div className="bg-card rounded border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("quest.title")}</h3>
          {!dailyQuests.bonusClaimed && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              +{dailyQuests.reward?.points ?? 80}P
            </span>
          )}
        </div>
        {dailyQuests.allDone && !dailyQuests.bonusClaimed && (
          <button
            onClick={() => void handleClaim()}
            disabled={claiming}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:brightness-105 disabled:opacity-50"
          >
            {t("quest.claim_bonus")}
          </button>
        )}
        {dailyQuests.bonusClaimed && (
          <span className={`flex items-center gap-1 text-xs font-medium text-muted-foreground ${claimedPulse ? "text-primary" : ""}`}>
            <Check className="h-3.5 w-3.5" />
            {t("quest.all_done")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUEST_ROWS.map(({ key, icon: Icon, labelKey }) => {
          const done = !!dailyQuests.progress[key];
          const item = dailyQuests.items?.find((quest) => quest.key === key);
          return (
            <div
              key={key}
              className={`rounded-md px-2.5 py-2 text-xs transition-colors ${
                done ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{item?.title ?? t(labelKey)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug opacity-80">
                {item?.action ?? (lang === "ko" ? "지정 활동 1회" : lang === "ja" ? "指定アクション1回" : "One required action")}
              </p>
            </div>
          );
        })}
      </div>
      {dailyQuests.allDone && !dailyQuests.bonusClaimed && (
        <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          {lang === "ko"
            ? "모든 항목이 완료되었습니다. 보상 수령 버튼으로 확정 처리하세요."
            : lang === "ja"
              ? "すべての項目が完了しました。報酬を受け取って確定してください。"
              : "All items are complete. Claim the reward to finalize it."}
        </p>
      )}
    </div>
  );
}
