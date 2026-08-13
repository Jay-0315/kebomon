import { useEffect, useState } from "react";
import { CalendarCheck, Sparkles, Swords, Newspaper, Trophy, Check } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

const QUEST_ROWS: { key: string; icon: React.ElementType; labelKey: TranslationKey }[] = [
  { key: "login", icon: CalendarCheck, labelKey: "quest.login" },
  { key: "gacha", icon: Sparkles, labelKey: "quest.gacha" },
  { key: "battle", icon: Swords, labelKey: "quest.battle" },
  { key: "community", icon: Newspaper, labelKey: "quest.community" },
];

export default function WeeklyQuestCard() {
  const { weeklyQuests, fetchWeeklyQuests, claimWeeklyQuestBonus } = useAppData();
  const { t, lang } = useLang();
  const [claiming, setClaiming] = useState(false);
  const [claimedPulse, setClaimedPulse] = useState(false);

  useEffect(() => {
    void fetchWeeklyQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await claimWeeklyQuestBonus();
      setClaimedPulse(true);
      window.setTimeout(() => setClaimedPulse(false), 1800);
    } finally {
      setClaiming(false);
    }
  };

  if (!weeklyQuests) return null;

  return (
    <div className="bg-card rounded border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("weekly_quest.title")}</h3>
          {!weeklyQuests.bonusClaimed && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              +{weeklyQuests.reward?.points ?? 400}P
            </span>
          )}
        </div>
        {weeklyQuests.allDone && !weeklyQuests.bonusClaimed && (
          <button
            onClick={() => void handleClaim()}
            disabled={claiming}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:brightness-105 disabled:opacity-50"
          >
            {t("quest.claim_bonus")}
          </button>
        )}
        {weeklyQuests.bonusClaimed && (
          <span className={`flex items-center gap-1 text-xs font-medium text-muted-foreground ${claimedPulse ? "text-primary" : ""}`}>
            <Check className="h-3.5 w-3.5" />
            {t("quest.all_done")}
          </span>
        )}
      </div>
      {weeklyQuests.rotation && (
        <div className="mb-3 rounded-md border border-primary/15 bg-primary/5 px-3 py-2">
          <p className="text-xs font-semibold text-primary">{weeklyQuests.rotation.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{weeklyQuests.rotation.description}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUEST_ROWS.map(({ key, icon: Icon, labelKey }) => {
          const item = weeklyQuests.items?.find((quest) => quest.key === key);
          const count = item?.count ?? weeklyQuests.progress[key] ?? 0;
          const target = item?.target ?? weeklyQuests.targets[key] ?? 0;
          const done = count >= target;
          return (
            <div
              key={key}
              className={`rounded-md px-2.5 py-2 text-xs transition-colors ${
                done ? "bg-primary/10 text-primary" : item?.focused ? "bg-primary/5 text-foreground" : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{item?.title ?? t(labelKey)}</span>
                <span className="ml-auto shrink-0 tabular-nums">
                  {Math.min(count, target)}/{target}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/70">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${target > 0 ? Math.min(100, (count / target) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug opacity-80">
                {item?.action ?? (lang === "ko" ? "주간 목표 진행" : lang === "ja" ? "週間目標を進行" : "Weekly objective")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
