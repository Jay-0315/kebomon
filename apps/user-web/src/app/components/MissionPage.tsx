import { Link } from "react-router";
import { Trophy, Shield, Layers, Map, ChevronRight } from "lucide-react";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

interface MissionCard {
  to: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  tagKey: TranslationKey;
}

const MISSIONS: MissionCard[] = [
  {
    to: "/colosseum",
    icon: Trophy,
    color: "#f59e0b",
    glow: "#f59e0b22",
    titleKey: "nav.colosseum",
    descKey: "mission.colosseum_desc",
    tagKey: "mission.colosseum_tag",
  },
  {
    to: "/raid",
    icon: Shield,
    color: "#ef4444",
    glow: "#ef444422",
    titleKey: "mission.raid_title",
    descKey: "mission.raid_desc",
    tagKey: "mission.raid_tag",
  },
  {
    to: "/rogue",
    icon: Layers,
    color: "#8b5cf6",
    glow: "#8b5cf622",
    titleKey: "nav.rogue",
    descKey: "mission.rogue_desc",
    tagKey: "mission.rogue_tag",
  },
  {
    to: "/expedition",
    icon: Map,
    color: "#22c55e",
    glow: "#22c55e22",
    titleKey: "nav.expedition",
    descKey: "mission.expedition_desc",
    tagKey: "mission.expedition_tag",
  },
];

export default function MissionPage() {
  const { t } = useLang();

  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">
          {t("mission.page_title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("mission.page_desc")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {MISSIONS.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.to}
              to={m.to}
              className="group block rounded-2xl border border-border bg-card hover:bg-card/80 transition-all duration-200 hover:shadow-lg overflow-hidden"
              style={{ boxShadow: `0 0 0 1px ${m.color}22` }}
            >
              <div className="flex items-center gap-4 p-5">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: m.glow,
                    border: `1.5px solid ${m.color}44`,
                  }}
                >
                  <Icon style={{ color: m.color }} className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base">{t(m.titleKey)}</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: m.glow,
                        color: m.color,
                        border: `1px solid ${m.color}44`,
                      }}
                    >
                      {t(m.tagKey)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {t(m.descKey)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
