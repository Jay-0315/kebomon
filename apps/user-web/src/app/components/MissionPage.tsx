import { Link } from "react-router";
import { Trophy, Shield, Layers, Map, ChevronRight } from "lucide-react";
import { useLang } from "../context/LangContext";

interface MissionCard {
  to: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  titleKo: string;
  titleJa: string;
  titleEn: string;
  descKo: string;
  descJa: string;
  descEn: string;
  tagKo: string;
  tagJa: string;
  tagEn: string;
}

const MISSIONS: MissionCard[] = [
  {
    to: "/colosseum",
    icon: Trophy,
    color: "#f59e0b",
    glow: "#f59e0b22",
    titleKo: "콜로세움",
    titleJa: "コロシアム",
    titleEn: "Colosseum",
    descKo: "다른 유저와 실시간 대전을 펼치세요. 랭킹 포인트를 획득하고 시즌 보상을 노려보세요.",
    descJa: "他のプレイヤーとリアルタイム対戦。ランキングポイントを集めてシーズン報酬を狙おう。",
    descEn: "Battle other players in real-time. Earn ranking points and chase season rewards.",
    tagKo: "PvP",
    tagJa: "PvP",
    tagEn: "PvP",
  },
  {
    to: "/raid",
    icon: Shield,
    color: "#ef4444",
    glow: "#ef444422",
    titleKo: "보스 레이드",
    titleJa: "ボスレイド",
    titleEn: "Boss Raid",
    descKo: "강력한 보스에게 도전하세요. 공격력에 따라 랭킹이 매겨지고 희귀 보상을 획득합니다.",
    descJa: "強力なボスに挑もう。攻撃力でランキングが決まり、レアな報酬を手に入れよう。",
    descEn: "Challenge powerful bosses. Rankings are based on damage dealt, earning rare rewards.",
    tagKo: "PvE 랭킹",
    tagJa: "PvEランキング",
    tagEn: "PvE Ranking",
  },
  {
    to: "/rogue",
    icon: Layers,
    color: "#8b5cf6",
    glow: "#8b5cf622",
    titleKo: "로그라이크",
    titleJa: "ローグライク",
    titleEn: "Roguelike",
    descKo: "카드 덱을 구성해 던전을 탐험하세요. 노말·하드·지옥 3가지 난이도로 도전할 수 있습니다.",
    descJa: "カードデッキを組んでダンジョンを探索。ノーマル・ハード・ヘルの3難易度で挑戦できます。",
    descEn: "Build your card deck and explore the dungeon. Three difficulty levels await.",
    tagKo: "솔로 탐험",
    tagJa: "ソロ探索",
    tagEn: "Solo Run",
  },
  {
    to: "/expedition",
    icon: Map,
    color: "#22c55e",
    glow: "#22c55e22",
    titleKo: "원정",
    titleJa: "遠征",
    titleEn: "Expedition",
    descKo: "파티를 구성해 원정을 떠나세요. 시간이 지날수록 더 많은 보상이 쌓입니다.",
    descJa: "パーティを組んで遠征に出発。時間が経つほど報酬が積み重なります。",
    descEn: "Form a party and embark on an expedition. Rewards accumulate over time.",
    tagKo: "자동 보상",
    tagJa: "自動報酬",
    tagEn: "Auto Reward",
  },
];

export default function MissionPage() {
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";

  const lbl = (m: MissionCard) => ({
    title: ko ? m.titleKo : ja ? m.titleJa : m.titleEn,
    desc:  ko ? m.descKo  : ja ? m.descJa  : m.descEn,
    tag:   ko ? m.tagKo   : ja ? m.tagJa   : m.tagEn,
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">
          {ko ? "미션" : ja ? "ミッション" : "Mission"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {ko ? "다양한 콘텐츠에 도전하고 보상을 획득하세요"
              : ja ? "さまざまなコンテンツに挑戦して報酬を獲得しよう"
              : "Challenge various content and earn rewards"}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {MISSIONS.map((m) => {
          const { title, desc, tag } = lbl(m);
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
                  style={{ background: m.glow, border: `1.5px solid ${m.color}44` }}
                >
                  <Icon style={{ color: m.color }} className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base">{title}</span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: m.glow, color: m.color, border: `1px solid ${m.color}44` }}
                    >
                      {tag}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{desc}</p>
                </div>
                <ChevronRight
                  className="w-5 h-5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
