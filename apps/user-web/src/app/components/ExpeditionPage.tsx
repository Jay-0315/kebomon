import React, { useState, useEffect, useCallback } from "react";
import {
  Map, Lock, Clock, Users, Star, CheckCircle2,
  ChevronRight, AlertCircle, RefreshCw, Package, X,
  Castle, Landmark, Waves, Flame, HelpCircle, Swords, Trophy,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, getCharName, type CharacterRarity } from "../data/characters";
import { useLang } from "../context/LangContext";

// ── Style constants ─────────────────────────────────────────────────────────
const FONT = "'Noto Sans KR','Noto Sans JP',sans-serif";

const C_DARK = {
  bg:        "#07100a",
  panel:     "#0d1a12",
  panelDark: "#081010",
  border:    "#1a3020",
  gold:      "#f59e0b",
  text:      "#cbd5e1",
  textBright:"#e2e8f0",
  textDim:   "#64748b",
  green:     "#22c55e",
  red:       "#ef4444",
};
const C_LIGHT = {
  bg:        "#162218",
  panel:     "#1e3020",
  panelDark: "#111c14",
  border:    "#2a4030",
  gold:      "#f59e0b",
  text:      "#c8d4c0",
  textBright:"#e0eedd",
  textDim:   "#7a9080",
  green:     "#22c55e",
  red:       "#ef4444",
};
// module-level alias for components defined outside the main function
const C = C_DARK;

function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(el.classList.contains("dark")));
    obs.observe(el, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function RuneStone({ flip }: { flip?: boolean }) {
  return (
    <svg width="28" height="52" viewBox="0 0 7 13" style={{imageRendering:"pixelated",display:"block",filter:"drop-shadow(0 0 3px #22c55e44)",transform:flip?"scaleX(-1)":undefined}}>
      <rect x="0" y="0" width="7" height="2" fill="#1e3010"/>
      <rect x="1" y="2" width="5" height="1" fill="#263818"/>
      <rect x="1" y="3" width="5" height="7" fill="#182610"/>
      <rect x="2" y="3" width="3" height="7" fill="#1e3014"/>
      <rect x="3" y="4" width="1" height="5" fill="#22c55e" opacity="0.5"/>
      <rect x="2" y="6" width="3" height="1" fill="#22c55e" opacity="0.45"/>
      <rect x="3" y="6" width="1" height="1" fill="#4ade80" opacity="0.9"/>
      <rect x="5" y="4" width="1" height="5" fill="#166534" opacity="0.7"/>
      <rect x="6" y="5" width="1" height="2" fill="#166534" opacity="0.5"/>
      <rect x="0" y="10" width="7" height="3" fill="#1e3010"/>
      <rect x="1" y="12" width="2" height="1" fill="#166534" opacity="0.6"/>
      <rect x="4" y="12" width="1" height="1" fill="#166534" opacity="0.5"/>
    </svg>
  );
}

function RuinsArch() {
  return (
    <svg width="100" height="52" viewBox="0 0 25 13" style={{imageRendering:"pixelated",display:"block",filter:"drop-shadow(0 0 6px #22c55e22)"}}>
      <rect x="0" y="3" width="5" height="10" fill="#182610"/>
      <rect x="1" y="3" width="3" height="10" fill="#1e3014"/>
      <rect x="0" y="1" width="6" height="3" fill="#1e3010"/>
      <rect x="19" y="3" width="6" height="10" fill="#182610"/>
      <rect x="20" y="3" width="4" height="10" fill="#1e3014"/>
      <rect x="19" y="1" width="6" height="3" fill="#1e3010"/>
      <rect x="5" y="0" width="15" height="3" fill="#1e3010"/>
      <rect x="4" y="1" width="17" height="2" fill="#263818"/>
      <rect x="5" y="3" width="14" height="10" fill="#07100a"/>
      <rect x="8" y="1" width="1" height="1" fill="#4ade80" opacity="0.7"/>
      <rect x="12" y="0" width="1" height="2" fill="#22c55e" opacity="0.6"/>
      <rect x="16" y="1" width="1" height="1" fill="#4ade80" opacity="0.7"/>
      <rect x="2" y="5" width="1" height="3" fill="#4ade80" opacity="0.3"/>
      <rect x="24" y="4" width="1" height="5" fill="#166534" opacity="0.7"/>
      <rect x="23" y="6" width="1" height="2" fill="#166534" opacity="0.5"/>
      <rect x="19" y="3" width="1" height="1" fill="#07100a"/>
    </svg>
  );
}

const DIFF_COLOR: Record<string, string> = {
  low:    "#22c55e",
  medium: "#f59e0b",
  high:   "#ef4444",
  extreme:"#a855f7",
};
const DIFF_KO: Record<string,string> = { low:"낮음", medium:"중간", high:"높음", extreme:"최고" };
const DIFF_JA: Record<string,string> = { low:"低",   medium:"中",   high:"高",   extreme:"最高" };
const DIFF_EN: Record<string,string> = { low:"Low",  medium:"Medium",high:"High", extreme:"Extreme" };

const RARITY_REQ_ORDER: CharacterRarity[] = ["common","uncommon","rare","epic","legendary","mythic"];
const RARITY_KO: Record<string,string> = { common:"커먼",uncommon:"언커먼",rare:"레어",epic:"에픽",legendary:"레전더리",mythic:"신화" };
const RARITY_JA: Record<string,string> = { common:"コモン",uncommon:"アンコモン",rare:"レア",epic:"エピック",legendary:"レジェンダリー",mythic:"ミシック" };
const RARITY_EN: Record<string,string> = { common:"Common",uncommon:"Uncommon",rare:"Rare",epic:"Epic",legendary:"Legendary",mythic:"Mythic" };

// ── Region definitions ──────────────────────────────────────────────────────
interface RegionDef {
  id: string;
  nameKo: string; nameJa: string; nameEn: string;
  descKo: string; descJa: string; descEn: string;
  difficulty: "low" | "medium" | "high" | "extreme";
  minParty: number;
  minRarity: CharacterRarity;
  color: string;
  borderColor: string;
  icon: React.ReactNode;
  unlockRaidId: number | null;
  unlockDescKo: string; unlockDescJa: string; unlockDescEn: string;
  rewardBase: { points: number; stones: number; normalEgg: number; bigEgg: number; goldEgg: number };
}

const REGIONS: RegionDef[] = [
  {
    id: "grassland",
    nameKo: "초원의 평야", nameJa: "草原の平野", nameEn: "Grassland Plains",
    descKo: "끝없이 펼쳐진 초원. 가볍게 도전하기 좋은 입문 지역입니다.",
    descJa: "広大な草原。初心者向けのエリアです。",
    descEn: "A vast, open grassland — the perfect starting zone for beginner expeditions.",
    difficulty: "low", minParty: 2, minRarity: "common",
    color: "#22c55e", borderColor: "#15803d",
    icon: <Map size={18}/>, unlockRaidId: null, unlockDescKo: "", unlockDescJa: "", unlockDescEn: "",
    rewardBase: { points: 80, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  },
  {
    id: "forest",
    nameKo: "삼림의 비경", nameJa: "森の秘境", nameEn: "Hidden Forest",
    descKo: "울창한 숲 속 숨겨진 보물. 적당한 난이도의 원정 지역입니다.",
    descJa: "深い森に隠された宝。適度な難易度です。",
    descEn: "Treasures hidden deep within a dense forest. A mid-tier expedition zone.",
    difficulty: "low", minParty: 2, minRarity: "common",
    color: "#16a34a", borderColor: "#14532d",
    icon: <Map size={18}/>, unlockRaidId: null, unlockDescKo: "", unlockDescJa: "", unlockDescEn: "",
    rewardBase: { points: 100, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  },
  {
    id: "ruins",
    nameKo: "폐허의 유적", nameJa: "廃墟の遺跡", nameEn: "Ancient Ruins",
    descKo: "황폐한 성터에 숨겨진 고대의 비밀. 점프 레이드 클리어 후 해금됩니다.",
    descJa: "廃城に隠された古代の秘密。ジャンプレイドクリア後に解放されます。",
    descEn: "Ancient secrets buried in a crumbling fortress. Unlocked after clearing the Jump Raid.",
    difficulty: "medium", minParty: 3, minRarity: "uncommon",
    color: "#a8a29e", borderColor: "#57534e",
    icon: <Castle size={18}/>, unlockRaidId: 1,
    unlockDescKo: "점프 레이드 최초 클리어",
    unlockDescJa: "ジャンプレイド初回クリア",
    unlockDescEn: "Clear the Jump Raid for the first time",
    rewardBase: { points: 150, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  },
  {
    id: "plaza",
    nameKo: "광장의 시장", nameJa: "広場の市場", nameEn: "Ancient Bazaar",
    descKo: "활기 넘치는 고대 시장의 유물. 퀴즈 레이드 클리어 후 해금됩니다.",
    descJa: "賑わいの古代市場の遺物。クイズレイドクリア後に解放されます。",
    descEn: "Relics of a once-thriving ancient market. Unlocked after clearing the Quiz Raid.",
    difficulty: "medium", minParty: 3, minRarity: "uncommon",
    color: "#b45309", borderColor: "#92400e",
    icon: <Landmark size={18}/>, unlockRaidId: 3,
    unlockDescKo: "퀴즈 레이드 최초 클리어",
    unlockDescJa: "クイズレイド初回クリア",
    unlockDescEn: "Clear the Quiz Raid for the first time",
    rewardBase: { points: 160, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  },
  {
    id: "beach",
    nameKo: "해변의 보물섬", nameJa: "海辺の宝島", nameEn: "Treasure Island",
    descKo: "바닷가에 숨겨진 전설의 보물. 받아쓰기 레이드 클리어 후 해금됩니다.",
    descJa: "海岸に隠された伝説の宝。書き取りレイドクリア後に解放されます。",
    descEn: "A legendary treasure hidden along the shore. Unlocked after clearing the Dictation Raid.",
    difficulty: "high", minParty: 4, minRarity: "rare",
    color: "#38bdf8", borderColor: "#0369a1",
    icon: <Waves size={18}/>, unlockRaidId: 4,
    unlockDescKo: "받아쓰기 레이드 최초 클리어",
    unlockDescJa: "書き取りレイド初回クリア",
    unlockDescEn: "Clear the Dictation Raid for the first time",
    rewardBase: { points: 220, stones: 3, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  },
  {
    id: "altar",
    nameKo: "제단의 신비", nameJa: "祭壇の神秘", nameEn: "Blazing Altar",
    descKo: "불꽃이 타오르는 고대 제단. 탄막 레이드 클리어 후 해금됩니다.",
    descJa: "炎燃える古代の祭壇。弾幕レイドクリア後に解放されます。",
    descEn: "An ancient altar wreathed in flames. Unlocked after clearing the Bullet Raid.",
    difficulty: "extreme", minParty: 4, minRarity: "rare",
    color: "#f97316", borderColor: "#c2410c",
    icon: <Flame size={18}/>, unlockRaidId: 5,
    unlockDescKo: "탄막 레이드 최초 클리어",
    unlockDescJa: "弾幕レイド初回クリア",
    unlockDescEn: "Clear the Bullet Raid for the first time",
    rewardBase: { points: 280, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  },
];

// ── Duration options ────────────────────────────────────────────────────────
const DURATIONS = [
  { hours: 2, multiplier: 1.0 },
  { hours: 4, multiplier: 1.6 },
  { hours: 6, multiplier: 2.1 },
];

// ── Reward calculation ──────────────────────────────────────────────────────
function calcReward(region: RegionDef, partySize: number, durationMultiplier: number, difficulty: string) {
  const diffBonus = difficulty === "extreme" ? 1.5 : difficulty === "high" ? 1.3 : difficulty === "medium" ? 1.1 : 1.0;
  const partyBonus = 1 + (partySize - region.minParty) * 0.12;
  const mult = durationMultiplier * diffBonus * partyBonus;
  const b = region.rewardBase;
  return {
    points:    Math.round(b.points * mult),
    stones:    Math.round(b.stones * mult),
    normalEgg: b.normalEgg > 0 ? Math.round(b.normalEgg * mult) : 0,
    bigEgg:    b.bigEgg > 0 ? Math.round(b.bigEgg * mult) : 0,
    goldEgg:   b.goldEgg > 0 ? Math.round(b.goldEgg * mult) : 0,
  };
}

// ── localStorage helpers ────────────────────────────────────────────────────
const STORAGE_KEY = "kebo_expedition";
const COUNT_KEY   = "kebo_expedition_count";
const RAID_KEY    = "kebo_raid_first_clears";

interface ExpeditionState {
  regionId: string;
  partyIds: number[];
  startTime: number;
  durationMs: number;
  durationHours: number;
  rewardClaimed: boolean;
}

function loadExpedition(): ExpeditionState | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); }
  catch { return null; }
}
function saveExpedition(s: ExpeditionState | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}
function loadRaidClears(): Record<number, boolean> {
  try { return JSON.parse(localStorage.getItem(RAID_KEY) ?? "{}"); }
  catch { return {}; }
}
function getExpeditionCount(): number {
  return parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10);
}

// ── Time display ────────────────────────────────────────────────────────────
function fmtRemaining(ms: number, ko: boolean, ja?: boolean): string {
  if (ms <= 0) return ko ? "완료!" : ja ? "完了！" : "Done!";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return ko ? `${h}시간 ${m}분` : ja ? `${h}時間${m}分` : `${h}h ${m}m`;
  if (m > 0) return ko ? `${m}분 ${s}초` : ja ? `${m}分${s}秒` : `${m}m ${s}s`;
  return ko ? `${s}초` : ja ? `${s}秒` : `${s}s`;
}

// ── Character picker modal ──────────────────────────────────────────────────
function CharPickerModal({ ownedIds, selected, maxParty, minRarity, onToggle, onClose, ko, ja }: {
  ownedIds: number[];
  selected: number[];
  maxParty: number;
  minRarity: CharacterRarity;
  onToggle: (id: number) => void;
  onClose: () => void;
  ko: boolean;
  ja: boolean;
}) {
  const minIdx = RARITY_REQ_ORDER.indexOf(minRarity);
  const RARITY_SORT: CharacterRarity[] = ["mythic","legendary","epic","rare","uncommon","common"];
  const eligibleChars = CHARACTERS.filter(c =>
    ownedIds.includes(c.id) && RARITY_REQ_ORDER.indexOf(c.rarity) >= minIdx
  ).sort((a, b) => RARITY_SORT.indexOf(a.rarity) - RARITY_SORT.indexOf(b.rarity));

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:999, background:"#000b", display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={onClose}
    >
      <style>{`.exp-picker::-webkit-scrollbar{display:none}.exp-picker{scrollbar-width:none;-ms-overflow-style:none}`}</style>
      <div
        className="exp-picker"
        style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:14, padding:20,
          width:"min(480px,94vw)", maxHeight:"80vh", overflow:"auto", fontFamily:FONT }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <p style={{ margin:0, color:C.textBright, fontWeight:800, fontSize:15 }}>
            {ko ? "원정대원 선택" : ja ? "遠征隊員選択" : "Select Party Members"}
          </p>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.textDim }}>
            <X size={18}/>
          </button>
        </div>
        <p style={{ margin:"0 0 12px", fontSize:12, color:C.textDim }}>
          {ko ? `최대 ${maxParty}마리 · ${RARITY_KO[minRarity]}+ 등급만 참여 가능` : ja ? `最大${maxParty}匹 · ${RARITY_JA[minRarity]}+のみ参加可能` : `Max ${maxParty} · ${RARITY_EN[minRarity]}+ only`}
        </p>
        {eligibleChars.length === 0 && (
          <p style={{ color:C.textDim, fontSize:13, textAlign:"center", padding:"20px 0" }}>
            {ko ? "조건에 맞는 케보몬이 없습니다" : ja ? "条件に合うケボモンがいません" : "No Kebomon meet the requirements"}
          </p>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
          {eligibleChars.map(char => {
            const isSel = selected.includes(char.id);
            const isFull = !isSel && selected.length >= maxParty;
            return (
              <div
                key={char.id}
                onClick={() => !isFull && onToggle(char.id)}
                style={{
                  width:70, display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                  background: isSel ? `${C.green}18` : C.panelDark,
                  border: `2px solid ${isSel ? C.green : C.border}`,
                  borderRadius:10, padding:"8px 4px",
                  cursor: isFull ? "not-allowed" : "pointer",
                  opacity: isFull ? 0.4 : 1,
                  transition:"border-color 0.12s",
                }}
              >
                <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={40}/>
                <p style={{ margin:0, fontSize:9, color:isSel?C.green:C.textDim, fontWeight:700, textAlign:"center", lineHeight:1.3 }}>
                  {getCharName(char, ko?"ko":ja?"ja":"en").slice(0,6)}
                </p>
                {isSel && <CheckCircle2 size={12} color={C.green}/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Reward display ──────────────────────────────────────────────────────────
function RewardBadge({ label, count, color }: { label: string; count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:5,
      background:`${color}15`, border:`1px solid ${color}44`,
      borderRadius:6, padding:"4px 10px",
      fontSize:12, color, fontWeight:700, fontFamily:FONT,
    }}>
      {label} ×{count}
    </div>
  );
}

// ── Reward Info Popup ───────────────────────────────────────────────────────
function RewardInfoPopup({ ko, ja, onClose }: { ko: boolean; ja: boolean; onClose: () => void }) {
  const durationRows = [
    { hours: 2, mult: 1.0,  bonus: ko ? "기준" : ja ? "基準" : "Base" },
    { hours: 4, mult: 1.6,  bonus: "+60%" },
    { hours: 6, mult: 2.1,  bonus: "+110%" },
  ];
  const diffRows = [
    { label: ko ? "낮음"  : ja ? "低"   : "Low",     mult: 1.0, bonus: ko ? "기준" : ja ? "基準" : "Base", color: DIFF_COLOR.low },
    { label: ko ? "중간"  : ja ? "中"   : "Medium",  mult: 1.1, bonus: "+10%",                              color: DIFF_COLOR.medium },
    { label: ko ? "높음"  : ja ? "高"   : "High",    mult: 1.3, bonus: "+30%",                              color: DIFF_COLOR.high },
    { label: ko ? "최고"  : ja ? "最高" : "Extreme", mult: 1.5, bonus: "+50%",                              color: DIFF_COLOR.extreme },
  ];
  const partyRows = [1, 2, 3, 4].map(extra => ({
    extra,
    bonus: `+${(extra * 12)}%`,
    mult: (1 + extra * 0.12).toFixed(2),
  }));

  const sectionTitle: React.CSSProperties = {
    margin: "0 0 6px", fontSize: 12, fontWeight: 800,
    color: C.textBright, fontFamily: FONT,
  };
  const th: React.CSSProperties = {
    fontSize: 10, color: C.textDim, fontWeight: 700, padding: "3px 8px",
    background: "#0d1a12", textAlign: "left" as const,
  };
  const td: React.CSSProperties = {
    fontSize: 11, color: C.text, padding: "4px 8px", fontFamily: FONT,
  };
  const tableStyle: React.CSSProperties = {
    width: "100%", borderCollapse: "collapse" as const,
    border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden",
    marginBottom: 14,
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000c", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: 20, width: "min(460px,94vw)", maxHeight: "85vh",
          overflow: "auto", fontFamily: FONT,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: C.green }}>
            {ko ? "원정 보상 안내" : ja ? "遠征報酬ガイド" : "Expedition Reward Guide"}
          </p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim }}>
            <X size={18} />
          </button>
        </div>

        {/* 원정 시간 배율 */}
        <p style={sectionTitle}><Clock size={12} style={{display:"inline",verticalAlign:"middle",marginRight:5}}/>{ko ? "원정 시간 배율" : ja ? "遠征時間倍率" : "Duration Multiplier"}</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>{ko ? "시간" : ja ? "時間" : "Hours"}</th>
              <th style={th}>{ko ? "배율" : ja ? "倍率" : "Multiplier"}</th>
              <th style={th}>{ko ? "증가량" : ja ? "増加量" : "Bonus"}</th>
            </tr>
          </thead>
          <tbody>
            {durationRows.map(r => (
              <tr key={r.hours} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ ...td, color: C.gold, fontWeight: 700 }}>{r.hours}{ko ? "시간" : ja ? "時間" : "h"}</td>
                <td style={{ ...td, fontWeight: 700 }}>×{r.mult.toFixed(1)}</td>
                <td style={{ ...td, color: C.green }}>{r.bonus}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 난이도 배율 */}
        <p style={sectionTitle}><Swords size={12} style={{display:"inline",verticalAlign:"middle",marginRight:5}}/>{ko ? "난이도 배율" : ja ? "難易度倍率" : "Difficulty Multiplier"}</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>{ko ? "난이도" : ja ? "難易度" : "Difficulty"}</th>
              <th style={th}>{ko ? "배율" : ja ? "倍率" : "Multiplier"}</th>
              <th style={th}>{ko ? "증가량" : ja ? "増加量" : "Bonus"}</th>
            </tr>
          </thead>
          <tbody>
            {diffRows.map(r => (
              <tr key={r.label} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ ...td, color: r.color, fontWeight: 700 }}>{r.label}</td>
                <td style={{ ...td, fontWeight: 700 }}>×{r.mult.toFixed(1)}</td>
                <td style={{ ...td, color: C.green }}>{r.bonus}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 파티 인원 보너스 */}
        <p style={sectionTitle}><Users size={12} style={{display:"inline",verticalAlign:"middle",marginRight:5}}/>{ko ? "파티 인원 보너스" : ja ? "パーティー人数ボーナス" : "Party Size Bonus"}</p>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: C.textDim, fontFamily: FONT }}>
          {ko ? "* 각 지역 최소 인원 초과 시 1마리당 +12% 가산" : ja ? "* 最低人数を超えると1匹ごとに+12%加算" : "* +12% per extra member above the minimum"}
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>{ko ? "초과 인원" : ja ? "超過人数" : "Extra Members"}</th>
              <th style={th}>{ko ? "파티 배율" : ja ? "パーティー倍率" : "Party Multiplier"}</th>
              <th style={th}>{ko ? "보너스" : ja ? "ボーナス" : "Bonus"}</th>
            </tr>
          </thead>
          <tbody>
            {partyRows.map(r => (
              <tr key={r.extra} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ ...td, color: "#60a5fa", fontWeight: 700 }}>+{r.extra}{ko ? "마리" : ja ? "匹" : " member"+(r.extra>1?"s":"")}</td>
                <td style={{ ...td, fontWeight: 700 }}>×{r.mult}</td>
                <td style={{ ...td, color: C.green }}>{r.bonus}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 최대 배율 */}
        <div style={{
          background: `${C.gold}12`, border: `1px solid ${C.gold}44`,
          borderRadius: 8, padding: "10px 12px",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 800, color: C.gold }}>
            <Trophy size={12} style={{display:"inline",verticalAlign:"middle",marginRight:5}}/>{ko ? "최대 배율 조합 (6시간 + 최고난이도 + +4마리)" : ja ? "最大倍率 (6h + 最高難易度 + +4匹)" : "Max combo: 6h + Extreme + 4 extra members"}
          </p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: C.gold }}>
            2.1 × 1.5 × 1.48 ≈ <span style={{ fontSize: 17 }}>×4.66</span>
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 10, color: C.textDim }}>
            {ko ? "* 배율은 모두 곱연산으로 적용됩니다" : ja ? "* 倍率はすべて掛け算で適用されます" : "* All multipliers stack multiplicatively"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ExpeditionPage() {
  const { rewardSummary, completeExpedition } = useAppData();
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const isDark = useIsDark();
  const C = isDark ? C_DARK : C_LIGHT;
  const [showInfo, setShowInfo] = useState(false);

  const ownedIds = rewardSummary.ownedCharacterIds;

  const [selectedRegion, setSelectedRegion] = useState<RegionDef>(REGIONS[0]);
  const [party, setParty] = useState<number[]>([]);
  const [durationIdx, setDurationIdx] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [expedition, setExpedition] = useState<ExpeditionState | null>(() => loadExpedition());
  const [raidClears, setRaidClears] = useState<Record<number, boolean>>(() => loadRaidClears());
  const [now, setNow] = useState(Date.now());
  const [showRewardResult, setShowRewardResult] = useState<ReturnType<typeof calcReward> | null>(null);

  // Refresh countdown every second when active
  useEffect(() => {
    if (!expedition || expedition.rewardClaimed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expedition]);

  // Sync raid clears from localStorage when page is focused
  useEffect(() => {
    const onFocus = () => setRaidClears(loadRaidClears());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const isUnlocked = useCallback((region: RegionDef) => {
    if (region.unlockRaidId === null) return true;
    return !!raidClears[region.unlockRaidId];
  }, [raidClears]);

  const canDepart = useCallback(() => {
    if (!expedition || expedition.rewardClaimed) {
      if (party.length < selectedRegion.minParty) return false;
      if (!!expedition && !expedition.rewardClaimed) return false;
      return true;
    }
    return false;
  }, [expedition, party, selectedRegion]);

  const isComplete = expedition
    ? !expedition.rewardClaimed && Date.now() >= expedition.startTime + expedition.durationMs
    : false;

  const activeRegion = expedition ? REGIONS.find(r => r.id === expedition.regionId) ?? null : null;

  // ── Depart ────────────────────────────────────────────────────────────────
  const depart = useCallback(() => {
    if (!canDepart()) return;
    const dur = DURATIONS[durationIdx];
    const state: ExpeditionState = {
      regionId: selectedRegion.id,
      partyIds: party,
      startTime: Date.now(),
      durationMs: dur.hours * 3600000,
      durationHours: dur.hours,
      rewardClaimed: false,
    };
    saveExpedition(state);
    setExpedition(state);
    setParty([]);
  }, [canDepart, selectedRegion, party, durationIdx]);

  // ── Claim reward ──────────────────────────────────────────────────────────
  const claimReward = useCallback(() => {
    if (!expedition || !activeRegion || !isComplete) return;
    const dur = DURATIONS.find(d => d.hours === expedition.durationHours) ?? DURATIONS[0];
    const reward = calcReward(activeRegion, expedition.partyIds.length, dur.multiplier, activeRegion.difficulty);
    setShowRewardResult(reward);
    const newCount = getExpeditionCount() + 1;
    localStorage.setItem(COUNT_KEY, String(newCount));
    const updated: ExpeditionState = { ...expedition, rewardClaimed: true };
    saveExpedition(updated);
    setExpedition(updated);
    void completeExpedition({
      points:    reward.points,
      stones:    reward.stones,
      normalEgg: reward.normalEgg,
      bigEgg:    reward.bigEgg,
      goldEgg:   reward.goldEgg,
    });
  }, [expedition, activeRegion, isComplete, completeExpedition]);

  const dismissResult = useCallback(() => {
    setShowRewardResult(null);
    saveExpedition(null);
    setExpedition(null);
  }, []);

  const css = `
    @keyframes exp-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes exp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes exp-pulse{0%,100%{opacity:1}50%{opacity:0.6}}
  `;

  const remaining = expedition && !expedition.rewardClaimed
    ? Math.max(0, expedition.startTime + expedition.durationMs - now)
    : 0;

  const totalCount = getExpeditionCount();

  // ── Reward result overlay ─────────────────────────────────────────────────
  if (showRewardResult) {
    const r = showRewardResult;
    return (
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, gap:20 }}>
        <style>{css}</style>
        <Package size={64} color={C.gold} style={{ animation:"exp-float 2s ease-in-out infinite" }}/>
        <div style={{ textAlign:"center" }}>
          <p style={{ margin:0, fontSize:22, fontWeight:900, color:C.gold }}>{ko ? "원정 완료!" : ja ? "遠征完了！" : "Expedition Complete!"}</p>
          <p style={{ margin:"4px 0 0", fontSize:13, color:C.textDim }}>
            {ko ? `원정 ${totalCount}회 달성` : ja ? `遠征${totalCount}回達成` : `${totalCount} expedition${totalCount!==1?"s":""} completed`}
          </p>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
          <RewardBadge label={ko?"탐험 포인트":ja?"探険P":"Exp Points"} count={r.points} color={C.gold}/>
          <RewardBadge label={ko?"강화석":ja?"強化石":"Enhance Stones"} count={r.stones} color="#60a5fa"/>
          <RewardBadge label={ko?"일반 알":ja?"通常卵":"Normal Egg"} count={r.normalEgg} color="#94a3b8"/>
          <RewardBadge label={ko?"고급 알":ja?"上級卵":"Big Egg"} count={r.bigEgg} color="#4ade80"/>
          <RewardBadge label={ko?"황금 알":ja?"黄金卵":"Gold Egg"} count={r.goldEgg} color={C.gold}/>
        </div>
        <p style={{ fontSize:11, color:C.textDim, maxWidth:280, textAlign:"center", lineHeight:1.6 }}>
          {ko ? "* 실제 보상은 케보몬 내 강화 시스템에서 직접 적용됩니다" : ja ? "* 実際の報酬はケボモン強化システムで適用されます" : "* Rewards are applied directly in the Kebomon enhancement system"}
        </p>
        <button
          onClick={dismissResult}
          style={{ background:`linear-gradient(135deg,${C.gold}cc,${C.gold}88)`, border:`2px solid ${C.gold}`, borderRadius:10, padding:"12px 28px", color:"#1c1500", fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:FONT }}
        >
          {ko ? "확인" : ja ? "確認" : "OK"}
        </button>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT }}>
      <style>{css}</style>
      {showInfo && <RewardInfoPopup ko={ko} ja={ja} onClose={() => setShowInfo(false)} />}
      {showPicker && (
        <CharPickerModal
          ownedIds={ownedIds}
          selected={party}
          maxParty={5}
          minRarity={selectedRegion.minRarity}
          onToggle={id => setParty(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
          onClose={() => setShowPicker(false)}
          ko={ko}
          ja={ja}
        />
      )}

      {/* ── 유적 배너 ── */}
      <div style={{
        position:"relative",
        background:"linear-gradient(180deg,#060f04 0%,#0a1806 55%,#060f04 100%)",
        borderBottom:"2px solid #1a4020",
        padding:"18px 16px 16px",
        textAlign:"center",
        boxShadow:"0 4px 24px #0a2a0820",
      }}>
        <div style={{position:"absolute",inset:0,opacity:0.05,pointerEvents:"none",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 11px,#fff 11px,#fff 12px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(255,255,255,0.3) 19px,rgba(255,255,255,0.3) 20px)"}}/>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",
          background:"radial-gradient(ellipse 70% 50% at 50% 100%,#22c55e0c 0%,transparent 70%)"}}/>
        <p style={{margin:"0 0 6px",fontFamily:FONT,fontSize:10,letterSpacing:"0.5em",color:"#4a7a3a",fontWeight:900,position:"relative",zIndex:1}}>
          {ko?"케보몬 원정대":ja?"ケボモン遠征隊":"KEBOMON EXPEDITION"}
        </p>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:14,marginBottom:6,position:"relative",zIndex:1}}>
          <RuneStone/><RuinsArch/><RuneStone flip/>
        </div>
        <h1 style={{
          margin:"0 0 8px",position:"relative",zIndex:1,
          fontFamily:"'Courier New',monospace",fontSize:26,fontWeight:900,
          letterSpacing:"0.18em",color:"#4ade80",
          textShadow:"0 0 20px #22c55e, 2px 2px 0 #0a1806, -1px -1px 0 #0a1806",
          display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        }}>
          <Landmark size={20} color="#4ade80" strokeWidth={2.5}/>
          {ko?"케보몬 원정":ja?"ケボモン遠征":"EXPEDITION"}
          <Landmark size={20} color="#4ade80" strokeWidth={2.5}/>
        </h1>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10,position:"relative",zIndex:1}}>
          <div style={{height:1,width:32,background:"linear-gradient(90deg,transparent,#22c55e55)"}}/>
          <span style={{fontSize:11,color:"#4ade80",opacity:0.6}}>◈</span>
          <div style={{height:1,width:32,background:"linear-gradient(90deg,#22c55e55,transparent)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,position:"relative",zIndex:1}}>
          <span style={{fontSize:11,color:"#4a7a3a",fontFamily:FONT}}>
            {ko?`누적 원정 ${totalCount}회`:ja?`累計遠征 ${totalCount}回`:`${totalCount} expeditions`}
          </span>
          <button
            onClick={() => setShowInfo(true)}
            style={{background:"rgba(10,30,10,0.7)",border:"1px solid #2a6030",borderRadius:8,padding:"5px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,color:"#4ade80",fontFamily:FONT,fontSize:11,fontWeight:700}}
          >
            <HelpCircle size={13}/>{ko?"보상 안내":ja?"報酬ガイド":"Reward Guide"}
          </button>
        </div>
      </div>

      {/* Active expedition banner */}
      {expedition && !expedition.rewardClaimed && (
        <div style={{
          maxWidth:800, margin:"12px auto 0", padding:"0 16px",
          animation:"exp-in 0.3s ease-out both",
        }}>
          <div style={{
            background: isComplete ? `${C.green}18` : "#0d1a12",
            border: `2px solid ${isComplete ? C.green : C.border}`,
            borderRadius:12, padding:"12px 16px",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{ animation: isComplete ? "none" : "exp-float 2s ease-in-out infinite", flexShrink:0 }}>
              {isComplete
                ? <CheckCircle2 size={32} color={C.green}/>
                : <Clock size={32} color={C.gold} style={{ animation:"exp-pulse 2s ease-in-out infinite" }}/>
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:isComplete?C.green:C.textBright }}>
                {activeRegion ? (ko ? activeRegion.nameKo : ja ? activeRegion.nameJa : activeRegion.nameEn) : ""}
              </p>
              <p style={{ margin:"2px 0 0", fontSize:12, color:C.textDim }}>
                {ko
                  ? `원정대 ${expedition.partyIds.length}마리 · ${expedition.durationHours}시간 코스`
                  : ja ? `遠征隊${expedition.partyIds.length}匹 · ${expedition.durationHours}時間コース`
                  : `Party: ${expedition.partyIds.length} · ${expedition.durationHours}h course`
                }
              </p>
              {!isComplete && (
                <p style={{ margin:"2px 0 0", fontSize:13, color:C.gold, fontWeight:700 }}>
                  {ko ? "남은 시간: " : ja ? "残り時間: " : "Time left: "}{fmtRemaining(remaining, ko, ja)}
                </p>
              )}
            </div>
            {isComplete && (
              <button
                onClick={claimReward}
                style={{
                  background:`linear-gradient(135deg,${C.green}cc,${C.green}88)`,
                  border:`2px solid ${C.green}`,
                  borderRadius:8, padding:"8px 16px",
                  color:"#052e16", fontWeight:900, fontSize:13,
                  cursor:"pointer", fontFamily:FONT, flexShrink:0,
                }}
              >
                {ko ? "수령하기" : ja ? "受け取る" : "Claim"}
              </button>
            )}
          </div>
          {/* Party preview */}
          <div style={{ display:"flex", gap:6, marginTop:8, paddingLeft:4 }}>
            {expedition.partyIds.map(id => {
              const char = CHARACTERS.find(c => c.id === id);
              if (!char) return null;
              return (
                <div key={id} style={{ animation:"exp-float 2.5s ease-in-out infinite" }}>
                  <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={32}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content: region list + detail panel */}
      <div style={{
        maxWidth:800, margin:"12px auto 32px", padding:"0 16px",
        display:"grid", gridTemplateColumns:"minmax(180px,1fr) 1.4fr", gap:12,
      }}>
        {/* ── Left: Region list ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <p style={{ margin:"0 0 4px", fontSize:11, color:C.textDim, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
            {ko ? "지역 선택" : ja ? "エリア選択" : "Select Region"}
          </p>
          {REGIONS.map((region, idx) => {
            const unlocked = isUnlocked(region);
            const isActive = selectedRegion.id === region.id;
            const isDefault = region.unlockRaidId === null;
            const col = region.color;
            return (
              <button
                key={region.id}
                disabled={!unlocked}
                onClick={() => { if (unlocked) setSelectedRegion(region); }}
                style={{
                  background: isActive ? `${col}18` : C.panel,
                  border: `1.5px solid ${isActive ? col : unlocked ? C.border : "#111820"}`,
                  borderRadius:10, padding:"10px 12px",
                  display:"flex", alignItems:"center", gap:10,
                  cursor: unlocked ? "pointer" : "not-allowed",
                  opacity: unlocked ? 1 : 0.5,
                  transition:"border-color 0.12s, background 0.12s",
                  textAlign:"left", fontFamily:FONT,
                  animation:`exp-in 0.3s ${idx*0.04}s ease-out both`,
                }}
              >
                <span style={{ color: unlocked ? col : C.textDim, flexShrink:0 }}>
                  {unlocked ? region.icon : <Lock size={16}/>}
                </span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color: unlocked ? (isActive ? col : C.textBright) : C.textDim, lineHeight:1.3 }}>
                    {ko ? region.nameKo : ja ? region.nameJa : region.nameEn}
                  </p>
                  <p style={{ margin:0, fontSize:10, color: DIFF_COLOR[region.difficulty] }}>
                    {ko ? DIFF_KO[region.difficulty] : ja ? DIFF_JA[region.difficulty] : DIFF_EN[region.difficulty]}
                    {!isDefault && !unlocked && (
                      <span style={{ color:C.textDim }}> · {ko?"잠김":ja?"ロック":"Locked"}</span>
                    )}
                  </p>
                  {!isDefault && !unlocked && (
                    <p style={{ margin:"2px 0 0", fontSize:9, color:C.textDim, lineHeight:1.3 }}>
                      {ko ? region.unlockDescKo : ja ? region.unlockDescJa : region.unlockDescEn}
                    </p>
                  )}
                </div>
                {isActive && <ChevronRight size={14} color={col}/>}
              </button>
            );
          })}
        </div>

        {/* ── Right: Detail + departure ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {/* Region info card */}
          <div style={{
            background:C.panel, border:`1.5px solid ${selectedRegion.color}44`,
            borderRadius:12, overflow:"hidden",
          }}>
            {/* Title bar */}
            <div style={{
              background:`${selectedRegion.color}18`,
              borderBottom:`1px solid ${selectedRegion.color}33`,
              padding:"10px 14px",
              display:"flex", alignItems:"center", gap:8,
            }}>
              <span style={{ color:selectedRegion.color }}>{selectedRegion.icon}</span>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:900, color:selectedRegion.color }}>
                  {ko ? selectedRegion.nameKo : ja ? selectedRegion.nameJa : selectedRegion.nameEn}
                </p>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{
                    fontSize:10, fontWeight:700, color:DIFF_COLOR[selectedRegion.difficulty],
                    background:`${DIFF_COLOR[selectedRegion.difficulty]}18`,
                    borderRadius:4, padding:"1px 6px",
                  }}>
                    {ko ? DIFF_KO[selectedRegion.difficulty] : ja ? DIFF_JA[selectedRegion.difficulty] : DIFF_EN[selectedRegion.difficulty]}
                  </span>
                  {!isUnlocked(selectedRegion) && (
                    <span style={{ fontSize:10, color:C.textDim, display:"flex", alignItems:"center", gap:3 }}>
                      <Lock size={10}/> {ko ? selectedRegion.unlockDescKo : ja ? selectedRegion.unlockDescJa : selectedRegion.unlockDescEn}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ padding:"10px 14px" }}>
              <p style={{ margin:"0 0 10px", fontSize:12, color:C.textDim, lineHeight:1.7 }}>
                {ko ? selectedRegion.descKo : ja ? selectedRegion.descJa : selectedRegion.descEn}
              </p>
              {/* Requirements */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, background:"#1e2940", borderRadius:6, padding:"3px 8px" }}>
                  <Users size={11} color="#60a5fa"/>
                  <span style={{ fontSize:11, color:"#60a5fa", fontWeight:700 }}>
                    {ko ? `최소 ${selectedRegion.minParty}마리` : ja ? `最低${selectedRegion.minParty}匹` : `Min ${selectedRegion.minParty}`}
                  </span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4, background:"#1e1a30", borderRadius:6, padding:"3px 8px" }}>
                  <Star size={11} color="#a855f7"/>
                  <span style={{ fontSize:11, color:"#a855f7", fontWeight:700 }}>
                    {(ko ? RARITY_KO : ja ? RARITY_JA : RARITY_EN)[selectedRegion.minRarity]}+
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Locked message */}
          {!isUnlocked(selectedRegion) && (
            <div style={{
              background:"#1a0a0a", border:"1px solid #3a1010",
              borderRadius:10, padding:"10px 14px",
              display:"flex", alignItems:"center", gap:8,
            }}>
              <AlertCircle size={16} color="#ef4444"/>
              <p style={{ margin:0, fontSize:12, color:"#fca5a5" }}>
                {ko
                  ? `이 지역은 [${selectedRegion.unlockDescKo}] 후 해금됩니다`
                  : ja ? `このエリアは[${selectedRegion.unlockDescJa}]後に解放されます`
                  : `This region unlocks after: ${selectedRegion.unlockDescEn}`
                }
              </p>
            </div>
          )}

          {/* Party formation & time — only when unlocked and no active expedition */}
          {isUnlocked(selectedRegion) && (!expedition || expedition.rewardClaimed) && (
            <>
              {/* Party selection */}
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" }}>
                <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:700, color:C.textBright }}>
                  {ko ? "원정대 편성" : ja ? "遠征隊編成" : "Party Formation"} ({party.length}/{selectedRegion.minParty}~5)
                </p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                  {Array.from({ length: 5 }, (_, i) => {
                    const id = party[i];
                    const char = id !== undefined ? CHARACTERS.find(c => c.id === id) : undefined;
                    const isRequired = i < selectedRegion.minParty;
                    return (
                      <div
                        key={i}
                        onClick={() => char ? setParty(p => p.filter(x => x !== id)) : setShowPicker(true)}
                        style={{
                          width:52, height:52, borderRadius:10,
                          border: `2px solid ${char ? (isRequired ? C.green : selectedRegion.color) : isRequired ? "#2a3a2a" : C.border}`,
                          background: char ? `${selectedRegion.color}12` : C.panelDark,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          cursor:"pointer", position:"relative",
                          transition:"border-color 0.12s",
                        }}
                      >
                        {char
                          ? <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={36}/>
                          : <span style={{ fontSize:18, color:isRequired?"#2a4a2a":C.border, lineHeight:1 }}>+</span>
                        }
                        {isRequired && !char && (
                          <span style={{ position:"absolute", bottom:2, right:3, width:6, height:6, borderRadius:"50%", background:"#ef4444" }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowPicker(true)}
                  style={{
                    background:"none", border:`1px solid ${C.border}`, borderRadius:6,
                    padding:"5px 12px", color:C.textDim, cursor:"pointer",
                    fontFamily:FONT, fontSize:11,
                  }}
                >
                  {ko ? "케보몬 선택" : ja ? "ケボモン選択" : "Pick Kebomon"}
                </button>
              </div>

              {/* Duration selection */}
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" }}>
                <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:C.textBright }}>
                  {ko ? "원정 시간" : ja ? "遠征時間" : "Duration"}
                </p>
                <div style={{ display:"flex", gap:8 }}>
                  {DURATIONS.map((dur, i) => (
                    <button
                      key={i}
                      onClick={() => setDurationIdx(i)}
                      style={{
                        flex:1, background: durationIdx===i ? `${selectedRegion.color}22` : C.panelDark,
                        border: `1.5px solid ${durationIdx===i ? selectedRegion.color : C.border}`,
                        borderRadius:8, padding:"8px 4px",
                        color: durationIdx===i ? selectedRegion.color : C.textDim,
                        cursor:"pointer", fontFamily:FONT, fontWeight:700, fontSize:12,
                      }}
                    >
                      <div>{dur.hours}{ko?"시간":ja?"時間":"h"}</div>
                      <div style={{ fontSize:10, opacity:0.7 }}>×{dur.multiplier.toFixed(1)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward preview */}
              <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" }}>
                <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:700, color:C.textBright }}>
                  {ko ? "예상 보상" : ja ? "予想報酬" : "Expected Rewards"}
                </p>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {(() => {
                    const dur = DURATIONS[durationIdx];
                    const r = calcReward(selectedRegion, Math.max(party.length, selectedRegion.minParty), dur.multiplier, selectedRegion.difficulty);
                    return <>
                      <RewardBadge label={ko?"탐험 포인트":ja?"探険P":"Exp Points"} count={r.points} color={C.gold}/>
                      <RewardBadge label={ko?"강화석":ja?"強化石":"Enhance Stones"} count={r.stones} color="#60a5fa"/>
                      <RewardBadge label={ko?"일반 알":ja?"通常卵":"Normal Egg"} count={r.normalEgg} color="#94a3b8"/>
                      <RewardBadge label={ko?"고급 알":ja?"上級卵":"Big Egg"} count={r.bigEgg} color="#4ade80"/>
                      <RewardBadge label={ko?"황금 알":ja?"黄金卵":"Gold Egg"} count={r.goldEgg} color={C.gold}/>
                    </>;
                  })()}
                </div>
                <p style={{ margin:"6px 0 0", fontSize:10, color:C.textDim }}>
                  {ko ? "* 파티 마리 수가 많을수록 보상이 증가합니다" : ja ? "* 隊員が多いほど報酬が増加します" : "* More party members = more rewards"}
                </p>
              </div>

              {/* Depart button */}
              <button
                disabled={party.length < selectedRegion.minParty}
                onClick={depart}
                style={{
                  background: party.length >= selectedRegion.minParty
                    ? `linear-gradient(135deg,${selectedRegion.color}cc,${selectedRegion.color}88)`
                    : "#1a2020",
                  border: `2px solid ${party.length >= selectedRegion.minParty ? selectedRegion.color : C.border}`,
                  borderRadius:10, padding:"13px 0",
                  color: party.length >= selectedRegion.minParty ? "#052e16" : C.textDim,
                  fontWeight:900, fontSize:15, cursor: party.length >= selectedRegion.minParty ? "pointer" : "not-allowed",
                  fontFamily:FONT, width:"100%",
                }}
              >
                {party.length < selectedRegion.minParty
                  ? ko ? `최소 ${selectedRegion.minParty}마리 필요` : ja ? `最低${selectedRegion.minParty}匹必要` : `Need at least ${selectedRegion.minParty}`
                  : ko ? "원정 출발!" : ja ? "遠征出発！" : "Depart!"
                }
              </button>
            </>
          )}

          {/* Ongoing expedition: can't depart again */}
          {expedition && !expedition.rewardClaimed && !isComplete && (
            <div style={{
              background:C.panelDark, border:`1px solid ${C.border}`,
              borderRadius:10, padding:"12px 14px",
              display:"flex", alignItems:"center", gap:8,
            }}>
              <RefreshCw size={15} color={C.textDim}/>
              <p style={{ margin:0, fontSize:12, color:C.textDim }}>
                {ko ? "원정 진행 중입니다. 완료 후 다시 출발할 수 있습니다." : ja ? "遠征中です。完了後に再出発できます。" : "Expedition in progress. You can depart again after it's done."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
