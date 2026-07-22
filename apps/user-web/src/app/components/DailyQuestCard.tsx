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
  const { t } = useLang();
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    void fetchDailyQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await claimDailyQuestBonus();
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
              +80P
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
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Check className="h-3.5 w-3.5" />
            {t("quest.all_done")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUEST_ROWS.map(({ key, icon: Icon, labelKey }) => {
          const done = !!dailyQuests.progress[key];
          return (
            <div
              key={key}
              className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${
                done ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {done ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Icon className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{t(labelKey)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
