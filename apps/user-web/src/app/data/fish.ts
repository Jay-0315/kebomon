import type { CharacterRarity } from "./characters";

export interface FishDef {
  id: number;
  rarity: CharacterRarity;
  name: string; // en
  korName: string;
  jaName: string;
  asset: string;
}

// 서버(fish-master.constant.ts FISH_DEX_MILESTONES)와 동일한 값 — 표시 전용, 실제 지급은 서버가 판정
export const FISH_DEX_MILESTONES: { count: number; kp: number }[] = [
  { count: 6, kp: 100 },
  { count: 12, kp: 250 },
  { count: 18, kp: 500 },
  { count: 24, kp: 1000 },
  { count: 30, kp: 1600 },
  { count: 36, kp: 2500 },
];

const fishAsset = (id: number) => `/fishing-assets/fish/fish_${String(id).padStart(2, "0")}.png`;

const f = (id: number, rarity: CharacterRarity, name: string, korName: string, jaName: string): FishDef => ({
  id,
  rarity,
  name,
  korName,
  jaName,
  asset: fishAsset(id),
});

export const FISH: FishDef[] = [
  // common
  f(1, "common", "Crucian Carp", "붕어", "フナ"),
  f(2, "common", "Minnow", "피라미", "ハヤ"),
  f(3, "common", "Catfish", "메기", "ナマズ"),
  f(4, "common", "Loach", "미꾸라지", "ドジョウ"),
  f(25, "common", "Bluegill", "블루길", "ブルーギル"),
  f(26, "common", "Stone Moroko", "돌고기", "ムギツク"),
  // uncommon
  f(5, "uncommon", "Carp", "잉어", "コイ"),
  f(6, "uncommon", "Bass", "배스", "バス"),
  f(7, "uncommon", "Sweetfish", "은어", "アユ"),
  f(8, "uncommon", "Eel", "장어", "ウナギ"),
  f(27, "uncommon", "Rainbow Trout", "무지개송어", "ニジマス"),
  f(28, "uncommon", "Mandarin Fish", "쏘가리", "オヤニラミ"),
  // rare
  f(9, "rare", "Red Sea Bream", "참돔", "マダイ"),
  f(10, "rare", "Flounder", "광어", "ヒラメ"),
  f(11, "rare", "Lobster", "랍스터", "ロブスター"),
  f(12, "rare", "Octopus", "문어", "タコ"),
  f(29, "rare", "Pufferfish", "복어", "フグ"),
  f(30, "rare", "Flying Fish", "날치", "トビウオ"),
  // epic
  f(13, "epic", "Golden Carp", "황금잉어", "金鯉"),
  f(14, "epic", "Baby Great White", "새끼 백상아리", "ホホジロザメの子"),
  f(15, "epic", "Jellyfish King", "해파리 왕", "クラゲの王"),
  f(16, "epic", "Deep-sea Anglerfish", "심해 아귀", "深海アンコウ"),
  f(31, "epic", "Crystal Salmon", "수정연어", "クリスタルサーモン"),
  f(32, "epic", "Moonlight Ray", "달빛가오리", "月光エイ"),
  // legendary
  f(17, "legendary", "Marlin", "청새치", "カジキ"),
  f(18, "legendary", "Giant Tuna", "초대형 참치", "超巨大マグロ"),
  f(19, "legendary", "Century Turtle", "백년거북", "百年亀"),
  f(20, "legendary", "Aurora Eel", "오로라 뱀장어", "オーロラウナギ"),
  f(33, "legendary", "Sunken Crownfish", "침몰왕관어", "沈没クラウンフィッシュ"),
  f(34, "legendary", "Storm Manta", "폭풍쥐가오리", "嵐マンタ"),
  // mythic
  f(21, "mythic", "Leviathan", "리바이어던", "リヴァイアサン"),
  f(22, "mythic", "Mermaid's Tear", "인어의 눈물", "人魚の涙"),
  f(23, "mythic", "Golden Dragonfish", "황금용어", "金龍魚"),
  f(24, "mythic", "Kebomon Water Spirit", "케보몬 물의 정령", "ケボモン水の精霊"),
  f(35, "mythic", "Nebula Whale", "성운고래", "星雲クジラ"),
  f(36, "mythic", "Abyss Phoenixfish", "심연불사어", "深淵フェニックス魚"),
];

export const FISH_BY_ID = new Map(FISH.map((fi) => [fi.id, fi]));

export function getFishName(fish: FishDef, lang: string): string {
  if (lang === "ja") return fish.jaName;
  if (lang === "ko") return fish.korName;
  return fish.name;
}

// characters.ts의 RARITY_BG/RARITY_GLOW는 KebomonPage.tsx 로컬 상수라 재사용 불가 —
// 낚시터 전용으로 소규모 등급 배경/후광 스타일만 별도 정의
export const FISH_RARITY_BG: Record<CharacterRarity, string> = {
  common: "bg-gray-500/10",
  uncommon: "bg-green-500/10",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-amber-500/10",
  mythic: "bg-pink-500/10",
};

export const FISH_RARITY_GLOW: Record<CharacterRarity, string> = {
  common: "shadow-gray-400/20",
  uncommon: "shadow-green-400/30",
  rare: "shadow-blue-400/30",
  epic: "shadow-purple-400/40",
  legendary: "shadow-amber-400/50",
  mythic: "shadow-pink-400/60",
};

export const FISH_RARITY_HEX: Record<CharacterRarity, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
  mythic: "#f472b6",
};
