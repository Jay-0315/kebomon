import { useCallback, useEffect, useRef, useState } from "react";
import {
  Swords, Trophy, Shield, RefreshCw, ChevronLeft,
  Dices, Crown, Medal, Dice6, Zap,
} from "lucide-react";
import { getBattleSocket, disconnectBattleSocket } from "../lib/socket";
import { getStoredUser } from "../lib/auth";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, getCharName, type CharacterRarity } from "../data/characters";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";

// ─── 상수 ────────────────────────────────────────────────────────────────────
const MAX_HP = 150;
const FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";

// 중세 색상 팔레트
const C = {
  bg:         "linear-gradient(180deg,#0c0905 0%,#1a1208 40%,#100d07 70%,#0a0805 100%)",
  panel:      "linear-gradient(135deg,#1e1508 0%,#120e06 100%)",
  panelDark:  "linear-gradient(135deg,#130f05 0%,#0c0903 100%)",
  border:     "#5a3d0e",
  borderFaint:"#2e1f06",
  gold:       "#c8a44a",
  goldGlow:   "#8b6020",
  parchment:  "#e8d9b0",
  stone:      "#8b6f3a",
  stoneFaint: "#4a3010",
  playerBg:   "linear-gradient(180deg,#061a30 0%,#040f1c 100%)",
  playerBorder:"#1e3a5f",
  enemyBg:    "linear-gradient(180deg,#1f0707 0%,#130404 100%)",
  enemyBorder:"#4f0e0e",
};

const TIERS = [
  { key:"bronze",    ko:"브론즈",    ja:"ブロンズ",      min:0,    color:"#cd7f32",glow:"#8B4513" },
  { key:"silver",    ko:"실버",      ja:"シルバー",      min:1000, color:"#c0c0c0",glow:"#708090" },
  { key:"gold",      ko:"골드",      ja:"ゴールド",      min:2000, color:"#ffd700",glow:"#b8860b" },
  { key:"platinum",  ko:"플레티넘",  ja:"プラチナ",      min:3000, color:"#40e0d0",glow:"#008b8b" },
  { key:"diamond",   ko:"다이아몬드",ja:"ダイヤモンド",  min:4000, color:"#b9f2ff",glow:"#4169e1" },
  { key:"master",    ko:"마스터",    ja:"マスター",      min:5000, color:"#da70d6",glow:"#800080" },
  { key:"challenger",ko:"챌린저",   ja:"チャレンジャー",min:6000, color:"#ff4500",glow:"#8b0000" },
] as const;

const RARITY_DICE_CONFIG: Record<string,{faces:number;count:number}> = {
  common:{faces:6,count:1}, uncommon:{faces:6,count:1},
  rare:{faces:8,count:1},   epic:{faces:12,count:1},
  legendary:{faces:6,count:2}, mythic:{faces:8,count:2},
};

const RARITY_THEME: Record<CharacterRarity,{color:string;glow:string;border:string;bg:string}> = {
  common:    {color:"#94a3b8",glow:"#64748b",border:"#475569",bg:"#0f172a"},
  uncommon:  {color:"#4ade80",glow:"#22c55e",border:"#15803d",bg:"#052e16"},
  rare:      {color:"#60a5fa",glow:"#3b82f6",border:"#1d4ed8",bg:"#082f49"},
  epic:      {color:"#c084fc",glow:"#a855f7",border:"#7e22ce",bg:"#2e1065"},
  legendary: {color:"#fbbf24",glow:"#f59e0b",border:"#b45309",bg:"#451a03"},
  mythic:    {color:"#f472b6",glow:"#ec4899",border:"#be185d",bg:"#500724"},
};

const RARITY_KO: Record<string,string> = {
  common:"커먼",uncommon:"언커먼",rare:"레어",epic:"에픽",legendary:"레전더리",mythic:"신화",
};
const RARITY_JA: Record<string,string> = {
  common:"コモン",uncommon:"アンコモン",rare:"レア",epic:"エピック",legendary:"レジェンダリー",mythic:"ミシック",
};

function getTierIdx(pts:number){
  for(let i=TIERS.length-1;i>=0;i--) if(pts>=TIERS[i].min) return i;
  return 0;
}
const charById=(id:number)=>CHARACTERS.find(c=>c.id===id)??CHARACTERS[0];
const nextHourStartMs=(now=Date.now())=>{
  const next=new Date(now);
  next.setHours(next.getHours()+1,0,0,0);
  return next.getTime();
};
const BATTLE_EXIT_WARNING="지금 나가시면 자동으로 패배처리 됩니다. 정말로 나가시겠습니까?";


// ─── 픽셀 도트 주사위 SVG ────────────────────────────────────────────────────
// 7×7 그리드, 핍 좌표 (col,row)
const PIP_POSITIONS: Record<number,[number,number][]> = {
  1: [[4.5,4.5]],
  2: [[6.5,2.5],[2.5,6.5]],
  3: [[6.5,2.5],[4.5,4.5],[2.5,6.5]],
  4: [[2.5,2.5],[6.5,2.5],[2.5,6.5],[6.5,6.5]],
  5: [[2.5,2.5],[6.5,2.5],[4.5,4.5],[2.5,6.5],[6.5,6.5]],
  6: [[2.5,2.5],[2.5,4.5],[2.5,6.5],[6.5,2.5],[6.5,4.5],[6.5,6.5]],
};

function PixelDiceSvg({
  value, size=48, faceColor="#1e3a5f", pipColor="#93c5fd", borderColor="#60a5fa", isRolling=false,
}:{value:number;size?:number;faceColor?:string;pipColor?:string;borderColor?:string;isRolling?:boolean;}){
  const pips = PIP_POSITIONS[Math.min(Math.max(value,1),6)] ?? PIP_POSITIONS[6];
  const showNumber = value > 6;
  return(
    <div style={{
      position:"relative",width:size,height:size,flexShrink:0,
      animation:isRolling?"col-dice-tumble 0.22s ease-in-out infinite":"col-roll-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      <svg width={size} height={size} viewBox="0 0 9 9" style={{imageRendering:"pixelated",display:"block"}}>
        {/* 본체 */}
        <rect x="0" y="0" width="9" height="9" fill={faceColor}/>
        {/* 테두리 픽셀 */}
        <rect x="1" y="0" width="7" height="1" fill={borderColor}/>
        <rect x="1" y="8" width="7" height="1" fill={borderColor}/>
        <rect x="0" y="1" width="1" height="7" fill={borderColor}/>
        <rect x="8" y="1" width="1" height="7" fill={borderColor}/>
        {/* 모서리 픽셀 */}
        <rect x="1" y="1" width="1" height="1" fill={borderColor} opacity="0.5"/>
        <rect x="7" y="1" width="1" height="1" fill={borderColor} opacity="0.5"/>
        <rect x="1" y="7" width="1" height="1" fill={borderColor} opacity="0.5"/>
        <rect x="7" y="7" width="1" height="1" fill={borderColor} opacity="0.5"/>
        {/* 내부 하이라이트 (입체감) */}
        <rect x="2" y="1" width="5" height="1" fill={borderColor} opacity="0.15"/>
        <rect x="1" y="2" width="1" height="5" fill={borderColor} opacity="0.15"/>
        {/* 핍 */}
        {!showNumber && pips.map(([cx,cy],i)=>(
          <rect key={i} x={cx-0.5} y={cy-0.5} width="1" height="1" fill={pipColor}/>
        ))}
      </svg>
      {/* d8/d12 등 숫자 표시 */}
      {showNumber&&(
        <div style={{
          position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-54%)",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:size*0.38,color:pipColor,lineHeight:1,
          width:"100%",height:"100%",textAlign:"center",
        }}>
          {value}
        </div>
      )}
    </div>
  );
}

// ─── 주사위 라벨 칩 ──────────────────────────────────────────────────────────
function DiceLabelChip({rarity}:{rarity:string}){
  const cfg=RARITY_DICE_CONFIG[rarity]??{faces:6,count:1};
  const MaxIcon=cfg.faces<=6?Dice6:Dices;
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,background:"#0c0803",
      border:`2px solid ${C.borderFaint}`,borderRadius:3,padding:"4px 10px"}}>
      {Array.from({length:Math.min(cfg.count,2)},(_,i)=>(
        <MaxIcon key={i} size={16} color={C.gold} strokeWidth={1.5}/>
      ))}
      {cfg.count>2&&<span style={{fontFamily:"monospace",fontSize:11,color:C.gold}}>…</span>}
      <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:C.gold}}>
        ×{cfg.count} d{cfg.faces}
      </span>
    </div>
  );
}

// ─── 픽셀 불꽃 ───────────────────────────────────────────────────────────────
function PixelFlame({delay=0}:{delay?:number}){
  return(
    <div style={{animation:`col-flame 0.22s ease-in-out ${delay}s infinite`,transformOrigin:"bottom center",display:"inline-block"}}>
      <svg width="16" height="24" viewBox="0 0 4 6" style={{imageRendering:"pixelated",display:"block"}}>
        <rect x="1" y="0" width="2" height="1" fill="#fff7ed"/>
        <rect x="1" y="1" width="2" height="1" fill="#fde68a"/>
        <rect x="0" y="2" width="4" height="1" fill="#fbbf24"/>
        <rect x="0" y="3" width="4" height="1" fill="#f97316"/>
        <rect x="1" y="4" width="2" height="1" fill="#ea580c"/>
        <rect x="1" y="5" width="2" height="1" fill="#92400e"/>
      </svg>
    </div>
  );
}
function Torch({flip}:{flip?:boolean}){
  return(
    <div style={{transform:flip?"scaleX(-1)":undefined,display:"inline-flex",flexDirection:"column",alignItems:"center"}}>
      <PixelFlame delay={flip?0.07:0}/>
      <svg width="12" height="20" viewBox="0 0 3 5" style={{imageRendering:"pixelated",display:"block"}}>
        <rect x="1" y="0" width="1" height="4" fill="#92400e"/>
        <rect x="0" y="3" width="3" height="1" fill="#78350f"/>
        <rect x="1" y="4" width="1" height="1" fill="#451a03"/>
      </svg>
    </div>
  );
}

// ─── HP 바 (부드러운 애니메이션) ─────────────────────────────────────────────
function HpBar({hp,maxHp}:{hp:number;maxHp:number}){
  const prevRef=useRef(hp);
  const[flash,setFlash]=useState(false);
  useEffect(()=>{
    if(hp<prevRef.current){
      setFlash(true);
      const tid=setTimeout(()=>setFlash(false),480);
      prevRef.current=hp;
      return()=>clearTimeout(tid);
    }
    prevRef.current=hp;
  },[hp]);
  const pct=Math.max(0,hp/maxHp);
  const col=pct>0.5?"#4ade80":pct>0.25?"#facc15":"#f87171";
  const glow=pct>0.5?"#22c55e":"#ef4444";
  return(
    <div style={{position:"relative",height:14,background:"#050a05",
      border:"1px solid #0a150a",borderRadius:3,overflow:"hidden"}}>
      <div style={{
        position:"absolute",inset:"0 auto 0 0",
        width:`${pct*100}%`,
        background:`linear-gradient(180deg,${col}cc,${col})`,
        boxShadow:`0 0 8px ${glow}55`,
        borderRadius:3,
        transition:"width 0.45s cubic-bezier(0.25,0.8,0.25,1), background 0.4s",
      }}/>
      <div style={{
        position:"absolute",top:0,left:0,right:`${(1-pct)*100}%`,height:"45%",
        background:"rgba(255,255,255,0.2)",borderRadius:"3px 3px 0 0",
        transition:"right 0.45s cubic-bezier(0.25,0.8,0.25,1)",
        pointerEvents:"none",
      }}/>
      {flash&&(
        <div style={{
          position:"absolute",inset:0,
          background:"rgba(255,255,255,0.5)",
          animation:"col-hp-flash 0.45s ease-out forwards",
          pointerEvents:"none",
        }}/>
      )}
    </div>
  );
}

// ─── 픽셀 버튼 ───────────────────────────────────────────────────────────────
function PixelBtn({onClick,disabled,children,color="amber"}:{
  onClick:()=>void;disabled?:boolean;children:React.ReactNode;color?:"amber"|"gray"|"red";
}){
  const ref=useRef<HTMLButtonElement>(null);
  const st={
    amber:{bg:"linear-gradient(180deg,#c8a44a 0%,#8b6020 100%)",border:"#5a3d0e",shadow:"#3a2508",text:"#1c1101"},
    gray: {bg:"linear-gradient(180deg,#64748b 0%,#475569 100%)",border:"#1e293b",shadow:"#0f172a",text:"#e2e8f0"},
    red:  {bg:"linear-gradient(180deg,#f87171 0%,#dc2626 100%)",border:"#7f1d1d",shadow:"#450a0a",text:"#fff5f5"},
  }[color];
  const press=()=>{if(!ref.current||disabled)return;ref.current.style.boxShadow=`0 2px 0 ${st.shadow}`;ref.current.style.transform="translateY(4px)";};
  const release=()=>{if(!ref.current)return;ref.current.style.boxShadow=`0 6px 0 ${st.shadow}`;ref.current.style.transform="translateY(0)";};
  return(
    <button ref={ref} onClick={onClick} disabled={disabled} onPointerDown={press} onPointerUp={release} onPointerLeave={release}
      style={{
        background:disabled?"linear-gradient(180deg,#374151 0%,#1f2937 100%)":st.bg,
        border:`3px solid ${disabled?"#111827":st.border}`,
        boxShadow:disabled?`0 3px 0 #111827`:`0 6px 0 ${st.shadow}`,
        color:disabled?"#6b7280":st.text,
        fontWeight:900,fontSize:16,letterSpacing:"0.04em",padding:"12px 28px",borderRadius:4,
        cursor:disabled?"not-allowed":"pointer",transition:"box-shadow 0.06s,transform 0.06s",
        width:"100%",fontFamily:FONT,userSelect:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
      }}>
      {children}
    </button>
  );
}

// ─── 티어 배지 ───────────────────────────────────────────────────────────────
function TierBadgeSvg({idx,size=48}:{idx:number;size?:number}){
  const t=TIERS[idx];
  const patterns=[
    [[1,1],[5,1],[2,2],[4,2],[1,2],[5,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[3,0],[2,1],[4,1],[1,2],[5,2],[2,3],[4,3],[3,4]],
    [[0,2],[2,0],[4,0],[6,2],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[1,4],[5,4]],
    [[3,0],[2,1],[4,1],[1,2],[5,2],[2,3],[4,3],[3,4],[2,5],[4,5]],
    [[2,0],[3,0],[4,0],[1,1],[5,1],[0,2],[6,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[3,0],[1,1],[5,1],[0,2],[2,2],[4,2],[6,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[2,0],[4,0],[0,1],[6,1],[1,2],[3,2],[5,2],[0,3],[2,3],[4,3],[6,3],[0,4],[6,4],[1,5],[5,5]],
  ];
  const px=size/7;
  const dots=patterns[idx]??patterns[0];
  return(
    <svg width={size} height={size} viewBox="0 0 7 7" style={{imageRendering:"pixelated",filter:`drop-shadow(0 0 ${px*0.5}px ${t.glow})`}}>
      {dots.map(([x,y],i)=><rect key={i} x={x} y={y} width={1} height={1} fill={t.color}/>)}
    </svg>
  );
}

// ─── 배틀 이벤트 카드 (공격자 배너 + 큰 주사위 + 데미지 + 피격 HP) ──────────
function BattleEventCard({rolls,total,attacker,isRolling,battle}:{
  rolls:number[];total:number;attacker:"player"|"opponent";
  isRolling:boolean;battle:BattleState;
}){
  const{lang}=useLang();
  const ko=lang==="ko";
  const isP=attacker==="player";
  const accent=isP?"#60a5fa":"#f87171";
  const glow=isP?"#3b82f6":"#ef4444";
  const dimBg=isP?"#0a2545":"#300a0a";
  const dimBorder=isP?"#1e3a5f":"#4f0e0e";
  const attackerName=isP?battle.player.nickname:battle.opponent.nickname;
  const defenderName=isP?battle.opponent.nickname:battle.player.nickname;
  const defenderHp=isP?battle.opponent.hp:battle.player.hp;
  const hpPct=Math.max(0,defenderHp/battle.maxHp);
  const hpColor=hpPct>0.5?"#4ade80":hpPct>0.25?"#facc15":"#f87171";
  return(
    <div style={{width:"100%",background:isP
      ?"linear-gradient(180deg,#061a30 0%,#040f1c 100%)"
      :"linear-gradient(180deg,#1f0606 0%,#130404 100%)",
      border:`2px solid ${dimBorder}`,borderRadius:5,overflow:"hidden",
      position:"relative",flexShrink:0}}>
      <div style={{position:"absolute",inset:0,opacity:0.04,
        backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,#fff 3px,#fff 4px)",
        pointerEvents:"none"}}/>
      {/* 공격자 배너 */}
      <div style={{background:dimBg,borderBottom:`1px solid ${dimBorder}`,
        padding:"7px 12px",display:"flex",alignItems:"center",gap:7}}>
        {isP?<Swords size={13} color={accent} strokeWidth={2.5}/>:<Zap size={13} color={accent} strokeWidth={2.5}/>}
        <span style={{color:accent,fontFamily:FONT,fontWeight:900,fontSize:13,letterSpacing:"0.1em",flex:1}}>
          {isP?(ko?"나의 공격!":"自分の攻撃!"):(ko?"적의 공격!":"敵の攻撃!")}
        </span>
        <span style={{fontSize:10,color:C.stoneFaint,fontFamily:FONT,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:80}}>
          {attackerName}
        </span>
      </div>
      {/* 주사위 + 결과 */}
      <div style={{padding:"14px 12px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          {rolls.map((r,i)=>(
            <PixelDiceSvg key={i} value={r} size={64}
              faceColor={isP?"#1e3a5f":"#3f0000"}
              pipColor={isP?"#93c5fd":"#fca5a5"}
              borderColor={accent}
              isRolling={isRolling}/>
          ))}
        </div>
        {isRolling&&(
          <span style={{fontSize:10,color:C.stoneFaint,fontFamily:FONT,letterSpacing:"0.15em",
            animation:"col-log-in 0.2s ease-out both"}}>
            {ko?"굴리는 중...":"ロール中..."}
          </span>
        )}
        {!isRolling&&total>0&&(
          <>
            <div style={{display:"flex",alignItems:"baseline",gap:6,
              animation:"col-roll-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both"}}>
              <span style={{fontSize:48,fontWeight:900,color:accent,fontFamily:"monospace",lineHeight:1,
                textShadow:`0 0 28px ${glow}55,0 0 10px ${glow}33`}}>
                -{total}
              </span>
              <span style={{fontSize:13,color:C.stone,fontFamily:FONT,fontWeight:700,
                letterSpacing:"0.1em",paddingBottom:5}}>DMG</span>
            </div>
            {/* 피격자 HP */}
            <div style={{width:"100%",background:"#08060200",
              border:`1px solid ${C.borderFaint}`,borderRadius:3,
              padding:"6px 10px",display:"flex",alignItems:"center",gap:8,
              animation:"col-log-in 0.3s ease-out 0.1s both"}}>
              <Shield size={10} color={C.stoneFaint} strokeWidth={2}/>
              <span style={{fontSize:10,color:C.stone,fontFamily:FONT,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>
                {defenderName}
              </span>
              <div style={{width:72,height:5,background:"#0f172a",borderRadius:1,overflow:"hidden",flexShrink:0}}>
                <div style={{height:"100%",width:`${hpPct*100}%`,background:hpColor,transition:"width 0.5s"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:900,color:accent,fontFamily:"monospace",flexShrink:0}}>
                {defenderHp}<span style={{fontSize:9,color:C.stoneFaint}}>/{battle.maxHp}</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 배틀 히스토리 행 ────────────────────────────────────────────────────────
function BattleHistoryRow({entry,opacity,maxHp}:{
  entry:{round:number;attacker:"player"|"opponent";rolls:number[];total:number;playerHp:number;opponentHp:number};
  opacity:number;maxHp:number;
}){
  const{lang}=useLang();
  const ko=lang==="ko";
  const isP=entry.attacker==="player";
  const accent=isP?"#2563eb":"#dc2626";
  const accentBright=isP?"#60a5fa":"#f87171";
  const defHp=isP?entry.opponentHp:entry.playerHp;
  return(
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",
      background:isP?"#060f1c":"#150404",
      borderLeft:`3px solid ${accent}`,borderRadius:2,opacity,fontFamily:"monospace",flexShrink:0}}>
      <span style={{fontSize:11,color:accent,flexShrink:0,minWidth:24,fontWeight:700}}>R{entry.round}</span>
      {isP?<Swords size={11} color={accentBright} strokeWidth={2}/>:<Zap size={11} color={accentBright} strokeWidth={2}/>}
      <span style={{fontSize:12,color:accentBright,fontWeight:700}}>[{entry.rolls.join("][")}]</span>
      <span style={{fontSize:11,color:C.stone,fontWeight:700}}>={entry.total}</span>
      <span style={{marginLeft:"auto",fontSize:11,color:C.stoneFaint,flexShrink:0}}>
        {ko?(isP?"적":"나"):(isP?"敵":"自")} HP {defHp}/{maxHp}
      </span>
    </div>
  );
}

// ─── 동전 오버레이 ───────────────────────────────────────────────────────────
function CoinFlipScreen({result,playerFirst}:{result:"heads"|"tails"|null;playerFirst:boolean;}){
  const {t}=useLang();
  return(
    <div style={{position:"fixed",inset:0,zIndex:60,
      background:"linear-gradient(180deg,#0c0905 0%,#1a1208 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <style>{`@keyframes coin-spin{0%{transform:rotateY(0deg) scale(1)}40%{transform:rotateY(540deg) scale(1.15)}100%{transform:rotateY(720deg) scale(1)}}`}</style>
      <div style={{animation:"coin-spin 1.6s cubic-bezier(0.23,1,0.32,1) forwards"}}>
        <svg width="96" height="96" viewBox="0 0 24 24" style={{imageRendering:"pixelated",filter:"drop-shadow(0 0 12px #c8a44a)"}}>
          <rect x="4" y="0" width="16" height="2" fill="#c8a44a"/>
          <rect x="2" y="2" width="20" height="2" fill="#c8a44a"/>
          <rect x="1" y="4" width="22" height="16" fill="#c8a44a"/>
          <rect x="2" y="20" width="20" height="2" fill="#c8a44a"/>
          <rect x="4" y="22" width="16" height="2" fill="#c8a44a"/>
          <rect x="3" y="2" width="18" height="1" fill="#8b6020"/>
          <rect x="8" y="7" width="2" height="10" fill="#5a3d0e"/>
          <rect x="14" y="7" width="2" height="10" fill="#5a3d0e"/>
          <rect x="8" y="10" width="8" height="2" fill="#5a3d0e"/>
          <rect x="8" y="13" width="8" height="2" fill="#5a3d0e"/>
        </svg>
      </div>
      {result&&(
        <div style={{textAlign:"center"}}>
          <p style={{fontSize:28,fontWeight:900,fontFamily:FONT,
            color:playerFirst?C.gold:"#94a3b8",textShadow:playerFirst?"0 0 20px #c8a44a":"none"}}>
            {result==="heads"?t("col.coin_heads"):t("col.coin_tails")}
          </p>
          <p style={{fontSize:16,fontWeight:700,color:C.parchment,fontFamily:FONT,marginTop:6}}>
            {playerFirst?t("col.first_attack"):t("col.opp_first")}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 인터페이스 ──────────────────────────────────────────────────────────────
interface RankingEntry{rank:number;userId:string;nickname:string;tierPoints:number;wins:number;winStreak:number;characterId:number|null;}
interface Fighter{userId:string;nickname:string;characterId:number;rarity:string;hp:number;}
interface BattleState{player:Fighter;opponent:Fighter;turn:"player"|"opponent";maxHp:number;playerGoesFirst:boolean;}
interface BattleResult{won:boolean;pointsDelta:number;tierPoints:number;wins:number;losses:number;winStreak:number;}
interface BattleStats{tierPoints:number;wins:number;losses:number;winStreak:number;}
interface BattleLogEntry{id:number;round:number;attacker:"player"|"opponent";rolls:number[];total:number;playerHp:number;opponentHp:number;}
type Phase="lobby"|"coin"|"battle"|"result";

// ─── 메인 ────────────────────────────────────────────────────────────────────
export default function ColosseumPage(){
  const{rewardSummary}=useAppData();
  const{lang,t}=useLang();
  const ko=lang==="ko";
  const myCharacterId=rewardSummary.equippedCharacterId??CHARACTERS[0].id;
  const myChar=charById(myCharacterId);
  const user=getStoredUser();

  // ── 랭킹 상태 ──
  const[rankings,setRankings]=useState<RankingEntry[]>([]);
  const[rankUpdatedAt,setRankUpdatedAt]=useState<number|null>(null);
  const[rankLoading,setRankLoading]=useState(false);
  const[rankClock,setRankClock]=useState(Date.now());

  const fetchRankings=useCallback(async()=>{
    setRankLoading(true);
    try{
      const res=await api.get<{rankings:RankingEntry[];updatedAt:number}>("/rewards/colosseum-rankings");
      setRankings(res.rankings);
      setRankUpdatedAt(res.updatedAt);
    }catch{/* silent */}
    setRankLoading(false);
  },[]);
  useEffect(()=>{fetchRankings();},[fetchRankings]);
  useEffect(()=>{
    const tick=()=>setRankClock(Date.now());
    const minuteId=setInterval(tick,60000);
    let hourlyId:ReturnType<typeof setInterval>|null=null;
    const delay=Math.max(1000,nextHourStartMs()-Date.now()+500);
    const hourId=setTimeout(()=>{
      tick();
      fetchRankings();
      hourlyId=setInterval(()=>{
        tick();
        fetchRankings();
      },3600000);
    },delay);
    return()=>{
      clearInterval(minuteId);
      clearTimeout(hourId);
      if(hourlyId)clearInterval(hourlyId);
    };
  },[fetchRankings]);

  // ── 배틀 상태 ──
  const[phase,setPhase]=useState<Phase>("lobby");
  const[coinResult,setCoinResult]=useState<"heads"|"tails"|null>(null);
  const[battle,setBattle]=useState<BattleState|null>(null);
  const[logText,setLogText]=useState("");
  const[result,setResult]=useState<BattleResult|null>(null);
  const[tierPts,setTierPts]=useState(0);
  const[stats,setStats]=useState({wins:0,losses:0,winStreak:0});
  const[rolling,setRolling]=useState(false);
  const[waitForNext,setWaitForNext]=useState(false);
  const[dmgNums,setDmgNums]=useState<{id:number;val:number;side:"player"|"opponent"}[]>([]);
  const[battleHistory,setBattleHistory]=useState<BattleLogEntry[]>([]);
  const phaseRef=useRef<Phase>("lobby");
  const forfeitingRef=useRef(false);
  const historyGuardRef=useRef(false);

  // ── 주사위 애니메이션 ──
  const[rollAnimRolls,setRollAnimRolls]=useState<number[]>([]);
  const[rollAnimActive,setRollAnimActive]=useState(false);
  const[rollAnimSide,setRollAnimSide]=useState<"player"|"opponent">("player");
  const[rollAnimTotal,setRollAnimTotal]=useState(0);
  const rollIntervalRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const battleRef=useRef<BattleState|null>(null);
  useEffect(()=>{battleRef.current=battle;},[battle]);
  useEffect(()=>{phaseRef.current=phase;},[phase]);

  const fetchBattleStats=useCallback(async()=>{
    if(!user?.id)return;
    try{
      const res=await api.get<BattleStats>(`/rewards/battle-stats?userId=${encodeURIComponent(user.id)}`);
      setTierPts(res.tierPoints);
      setStats({wins:res.wins,losses:res.losses,winStreak:res.winStreak});
    }catch{/* silent */}
  },[user?.id]);

  useEffect(()=>{fetchBattleStats();},[fetchBattleStats]);

  const startRollAnim=useCallback((side:"player"|"opponent",faces:number,count:number)=>{
    if(rollIntervalRef.current)clearInterval(rollIntervalRef.current);
    const gen=()=>Array.from({length:count},()=>Math.ceil(Math.random()*faces));
    setRollAnimSide(side);setRollAnimActive(true);setRollAnimRolls(gen());
    rollIntervalRef.current=setInterval(()=>setRollAnimRolls(gen()),70);
  },[]);

  const stopRollAnim=useCallback((finalRolls:number[],total:number)=>{
    if(rollIntervalRef.current){clearInterval(rollIntervalRef.current);rollIntervalRef.current=null;}
    setRollAnimActive(false);setRollAnimRolls(finalRolls);setRollAnimTotal(total);
  },[]);

  const spawnDmg=useCallback((val:number,side:"player"|"opponent")=>{
    const id=Date.now()+Math.random();
    setDmgNums(p=>[...p.slice(-4),{id,val,side}]);
    setTimeout(()=>setDmgNums(p=>p.filter(n=>n.id!==id)),900);
  },[]);

  useEffect(()=>{
    const s=getBattleSocket();
    s.on("battle:started",(d:{coinResult:"heads"|"tails";playerGoesFirst:boolean;player:Fighter;opponent:Fighter;turn:"player"|"opponent";maxHp:number;})=>{
      setCoinResult(d.coinResult);
      setBattle({player:d.player,opponent:d.opponent,turn:d.turn,maxHp:d.maxHp,playerGoesFirst:d.playerGoesFirst});
      setRollAnimRolls([]);setLogText(t("col.battle_start"));
      setWaitForNext(false);
      setPhase("coin");
      setTimeout(()=>setPhase("battle"),2400);
      if(!d.playerGoesFirst){
        setTimeout(()=>setWaitForNext(true),2400);
      }
    });
    s.on("battle:rolled",(d:{attacker:"player"|"opponent";rolls:number[];total:number;playerHp:number;opponentHp:number;})=>{
      stopRollAnim(d.rolls,d.total);setRolling(false);
      const isP=d.attacker==="player";
      const rolls=d.rolls.join("+");
      setLogText(isP
        ? t("col.dmg_player").replace("{rolls}",rolls).replace("{total}",String(d.total))
        : t("col.dmg_opponent").replace("{rolls}",rolls).replace("{total}",String(d.total)));
      spawnDmg(d.total,isP?"opponent":"player");
      setBattle(prev=>prev?{...prev,player:{...prev.player,hp:d.playerHp},opponent:{...prev.opponent,hp:d.opponentHp}}:prev);
      setBattleHistory(prev=>[...prev,{
        id:Date.now()+Math.random(),
        round:prev.length+1,
        attacker:d.attacker,
        rolls:d.rolls,
        total:d.total,
        playerHp:d.playerHp,
        opponentHp:d.opponentHp,
      }]);
    });
    s.on("battle:turn",(d:{turn:"player"|"opponent";})=>{
      setBattle(prev=>prev?{...prev,turn:d.turn}:prev);
      if(d.turn==="opponent") setWaitForNext(true);
      else setWaitForNext(false);
    });
    s.on("battle:ended",(d:BattleResult)=>{
      stopRollAnim([],0);setResult(d);
      setTierPts(d.tierPoints);setStats({wins:d.wins,losses:d.losses,winStreak:d.winStreak});
      setPhase("result");
    });
    return()=>{s.off("battle:started");s.off("battle:rolled");s.off("battle:turn");s.off("battle:ended");};
  },[t,spawnDmg,startRollAnim,stopRollAnim]);

  useEffect(()=>()=>{
    if(rollIntervalRef.current)clearInterval(rollIntervalRef.current);
    disconnectBattleSocket();
  },[]);

  const startBattle=useCallback(()=>{
    setPhase("coin");setCoinResult(null);setBattle(null);
    setRollAnimRolls([]);setRollAnimActive(false);setResult(null);
    setBattleHistory([]);setLogText("");setWaitForNext(false);
    getBattleSocket().emit("battle:start",{userId:user?.id,characterId:myCharacterId,nickname:user?.name??(ko?"플레이어":"プレイヤー")});
  },[user,myCharacterId,ko]);

  const rollDice=useCallback(()=>{
    if(rolling||battle?.turn!=="player")return;
    const cfg=RARITY_DICE_CONFIG[battle.player.rarity]??{faces:6,count:1};
    setRolling(true);startRollAnim("player",cfg.faces,cfg.count);
    getBattleSocket().emit("battle:roll",{userId:user?.id});
  },[rolling,battle,user,startRollAnim]);

  const ackOpponentTurn=useCallback(()=>{
    if(!battleRef.current)return;
    const cfg=RARITY_DICE_CONFIG[battleRef.current.opponent.rarity]??{faces:6,count:1};
    startRollAnim("opponent",cfg.faces,cfg.count);
    setWaitForNext(false);
    getBattleSocket().emit("battle:ack");
  },[startRollAnim]);

  const resetBattleUi=useCallback(()=>{
    if(rollIntervalRef.current){clearInterval(rollIntervalRef.current);rollIntervalRef.current=null;}
    battleRef.current=null;phaseRef.current="lobby";historyGuardRef.current=false;
    setBattle(null);setCoinResult(null);setRollAnimRolls([]);setRollAnimActive(false);setResult(null);
    setRollAnimTotal(0);setRolling(false);
    setBattleHistory([]);setLogText("");setWaitForNext(false);setDmgNums([]);
    setPhase("lobby");
  },[]);

  const reset=useCallback(()=>{
    resetBattleUi();
  },[resetBattleUi]);

  const forfeitBattle=useCallback(()=>{
    if(forfeitingRef.current)return;
    forfeitingRef.current=true;
    getBattleSocket().emit("battle:forfeit");
    resetBattleUi();
    setTimeout(()=>{forfeitingRef.current=false;},300);
  },[resetBattleUi]);

  const confirmForfeitAndExit=useCallback(()=>{
    if(!battleRef.current||!["coin","battle"].includes(phaseRef.current)){
      resetBattleUi();
      return true;
    }
    if(!window.confirm(BATTLE_EXIT_WARNING))return false;
    forfeitBattle();
    return true;
  },[forfeitBattle,resetBattleUi]);

  useEffect(()=>{
    const inProgress=!!battle&&["coin","battle"].includes(phase);
    if(!inProgress)return;
    if(!historyGuardRef.current){
      window.history.pushState({colosseumBattleGuard:true},"",window.location.href);
      historyGuardRef.current=true;
    }
    const onPopState=()=>{
      if(!battleRef.current||!["coin","battle"].includes(phaseRef.current)){
        historyGuardRef.current=false;
        return;
      }
      if(window.confirm(BATTLE_EXIT_WARNING)){
        forfeitBattle();
        historyGuardRef.current=false;
        window.history.back();
      }else{
        window.history.pushState({colosseumBattleGuard:true},"",window.location.href);
        historyGuardRef.current=true;
      }
    };
    window.addEventListener("popstate",onPopState);
    return()=>window.removeEventListener("popstate",onPopState);
  },[battle,phase,forfeitBattle]);

  const tierIdx=getTierIdx(tierPts);
  const tier=TIERS[tierIdx];
  const tierLabel=ko?tier.ko:tier.ja;
  const tierNext=TIERS[tierIdx+1]?.min??tier.min+1000;
  const tierProgress=Math.min(1,(tierPts-tier.min)/(tierNext-tier.min));

  // ── CSS ──
  const cssStyles=`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap');
    @keyframes col-flame      {0%,100%{transform:scaleX(1) scaleY(1)}30%{transform:scaleX(1.12) scaleY(0.9)}60%{transform:scaleX(0.9) scaleY(1.1)}}
    @keyframes col-dice-tumble{
      0%  {transform:rotate(0deg)   scale(1.0)  translateY(0px)}
      12% {transform:rotate(-24deg) scale(0.88) translateY(-6px)}
      25% {transform:rotate(30deg)  scale(1.06) translateY(0px)}
      37% {transform:rotate(-18deg) scale(0.92) translateY(-4px)}
      50% {transform:rotate(20deg)  scale(1.04) translateY(0px)}
      62% {transform:rotate(-12deg) scale(0.95) translateY(-2px)}
      75% {transform:rotate(10deg)  scale(1.02) translateY(0px)}
      87% {transform:rotate(-5deg)  scale(0.98) translateY(-1px)}
      100%{transform:rotate(0deg)   scale(1.0)  translateY(0px)}
    }
    @keyframes col-roll-in    {0%{opacity:0;transform:scale(0.5) rotate(-12deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    @keyframes col-log-in     {0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
    @keyframes col-dmg-up     {0%{opacity:1;transform:translateY(0) scale(1.3)}100%{opacity:0;transform:translateY(-48px) scale(0.9)}}
    @keyframes col-win-in     {0%{letter-spacing:0.6em;opacity:0}100%{letter-spacing:0.12em;opacity:1}}
    @keyframes col-idle-bob   {0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes col-enemy-bob  {0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
    @keyframes col-active-glow{0%,100%{filter:drop-shadow(0 0 6px #c8a44a)}50%{filter:drop-shadow(0 0 18px #c8a44a)}}
    @keyframes col-stone-glow {0%,100%{opacity:0.55}50%{opacity:0.9}}
    @keyframes col-hp-flash   {0%{opacity:0.7}100%{opacity:0}}
    .col-grid-top   {display:grid;grid-template-columns:1fr;gap:14px}
    .col-grid-bottom{display:grid;grid-template-columns:1fr;gap:14px}
    @media(min-width:640px){
      .col-grid-top   {grid-template-columns:1fr 1fr}
      .col-grid-bottom{grid-template-columns:3fr 2fr}
    }
  `;

  // ══════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ══════════════════════════════════════════════════════════════════════════
  if(phase==="lobby"){
    const rarityLabel=ko?(RARITY_KO[myChar.rarity]??myChar.rarity):(RARITY_JA[myChar.rarity]??myChar.rarity);
    const rarityTheme=RARITY_THEME[myChar.rarity];
    // 다음 갱신 계산
    const nextUpdateMs=rankUpdatedAt?Math.max(0,nextHourStartMs(rankClock)-rankClock):null;
    const nextUpdateMin=nextUpdateMs!=null?Math.ceil(nextUpdateMs/60000):null;

    return(
      <div style={{minHeight:"100vh",background:C.bg,padding:"0 0 40px",fontFamily:FONT}}>
        <style>{cssStyles}</style>

        {/* 헤더 */}
        <div style={{position:"relative",background:"linear-gradient(180deg,#1e1208 0%,#0c0905 100%)",
          borderBottom:`4px solid ${C.border}`,padding:"18px 16px 14px",textAlign:"center",
          boxShadow:`0 4px 32px ${C.goldGlow}66`}}>
          {/* 석재 질감 오버레이 */}
          <div style={{position:"absolute",inset:0,opacity:0.06,
            backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 15px,#fff 15px,#fff 16px),repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,0.5) 31px,rgba(255,255,255,0.5) 32px)",
            pointerEvents:"none"}}/>
          <p style={{fontFamily:FONT,fontSize:11,letterSpacing:"0.4em",color:C.stone,marginBottom:2,fontWeight:900}}>
            {t("col.kebomon")}
          </p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
            <Torch/><Torch flip/>
          </div>
          <h1 style={{fontFamily:"'Courier New',monospace",fontSize:28,fontWeight:900,
            letterSpacing:"0.22em",color:C.gold,
            textShadow:`0 0 24px ${C.goldGlow}, 2px 2px 0 #3a2508, -1px -1px 0 #3a2508`,
            margin:"6px 0 0",display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
            <Swords size={22} color={C.gold} strokeWidth={2.5}/>
            COLOSSEUM
            <Swords size={22} color={C.gold} strokeWidth={2.5}/>
          </h1>
        </div>

        <div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:14}}>

          {/* ── 상단 2열: 티어 카드 + 파이터 카드 ── */}
          <div className="col-grid-top">
            {/* 티어 카드 */}
            <div style={{background:C.panel,border:`2px solid ${tier.color}`,
              boxShadow:`0 0 20px ${tier.glow}66, inset 0 0 24px ${tier.glow}18, 0 0 0 1px #000`,borderRadius:6,padding:"16px 18px"}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <TierBadgeSvg idx={tierIdx} size={52}/>
                <div style={{flex:1}}>
                  <p style={{fontFamily:FONT,fontSize:18,fontWeight:900,color:tier.color,
                    textShadow:`0 0 8px ${tier.glow}`,margin:0}}>{tierLabel}</p>
                  <p style={{fontFamily:FONT,fontSize:12,color:C.stone,margin:"2px 0 8px"}}>{tierPts} pts</p>
                  <div style={{height:8,background:"#0a0703",border:`1px solid ${tier.glow}`,borderRadius:2,overflow:"hidden",
                    boxShadow:`0 0 10px ${tier.glow}44`}}>
                    <div style={{height:"100%",width:`${tierProgress*100}%`,
                      background:`linear-gradient(90deg,${tier.glow}88,${tier.color})`,
                      boxShadow:`0 0 12px ${tier.color}`,transition:"width 0.4s"}}/>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",gap:0,marginTop:12,borderTop:`1px solid ${C.borderFaint}`,paddingTop:10}}>
                {[
                  {label:t("battle.wins"),val:stats.wins,color:"#4ade80"},
                  {label:t("battle.losses"),val:stats.losses,color:"#f87171"},
                  {label:t("battle.streak"),val:stats.winStreak,color:C.gold},
                ].map(s=>(
                  <div key={s.label} style={{flex:1,textAlign:"center"}}>
                    <p style={{fontFamily:FONT,fontSize:20,fontWeight:900,color:s.color,margin:0}}>{s.val}</p>
                    <p style={{fontFamily:FONT,fontSize:10,color:C.stoneFaint,margin:0}}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 파이터 카드 */}
            <div style={{background:C.panel,border:`2px solid ${rarityTheme.border}`,
              boxShadow:`0 0 22px ${rarityTheme.glow}55, inset 0 0 24px ${rarityTheme.glow}12, 0 0 0 1px #000`,borderRadius:6,padding:16,
              display:"flex",alignItems:"center",gap:14}}>
              <div style={{animation:"col-idle-bob 2.4s ease-in-out infinite",display:"inline-block",
                filter:`drop-shadow(0 0 10px ${rarityTheme.glow}) drop-shadow(0 0 22px ${rarityTheme.glow}66)`}}>
                <PixelSprite type={myChar.type} colors={myChar.colors} characterId={myChar.id} rarity={myChar.rarity} size={72}/>
              </div>
              <div style={{flex:1}}>
                <p style={{fontFamily:FONT,fontSize:15,fontWeight:900,color:C.parchment,margin:0}}>
                  {user?.name??(ko?"플레이어":"プレイヤー")}
                </p>
                <p style={{fontFamily:FONT,fontSize:11,color:rarityTheme.color,
                  textShadow:`0 0 8px ${rarityTheme.glow}`,margin:"2px 0 8px"}}>
                  {getCharName(myChar,lang)} · {rarityLabel}
                </p>
                <DiceLabelChip rarity={myChar.rarity}/>
              </div>
            </div>
          </div>

          {/* 입장 버튼 */}
          <PixelBtn onClick={startBattle}>
            <Swords size={18} strokeWidth={2.5}/>
            {t("col.enter")}
          </PixelBtn>

          {/* 규칙 */}
          <div style={{background:C.panelDark,border:`1px solid ${C.borderFaint}`,
            borderRadius:4,padding:"10px 14px",fontFamily:FONT,fontSize:11,
            color:C.stone,lineHeight:1.9,whiteSpace:"pre-line"}}>
            {ko
              ?"• 동전으로 선공 결정\n• 턴마다 주사위 굴려 데미지\n• 먼저 HP 0이 된 쪽 패배\n• 승: +100pts  패: -50pts  연승: +20pts"
              :"• コインで先攻決定\n• ターンごとにダイスを振りダメージ\n• 先にHP0になった側が敗北\n• 勝: +100pts  負: -50pts  連勝: +20pts"}
          </div>

          {/* ── 하단 2열: 랭킹 + 티어 목록 ── */}
          <div className="col-grid-bottom">

            {/* ── 랭킹 패널 ── */}
            <div style={{background:C.panel,border:`2px solid ${C.border}`,borderRadius:6,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"10px 14px",borderBottom:`1px solid ${C.borderFaint}`,background:"#130e05"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Trophy size={15} color={C.gold} strokeWidth={2}/>
                  <span style={{fontFamily:FONT,fontSize:13,fontWeight:900,color:C.gold}}>{t("col.rankings")}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {rankUpdatedAt&&(
                    <span style={{fontFamily:FONT,fontSize:10,color:C.stoneFaint}}>
                      {t("col.last_updated")} {new Date(rankUpdatedAt).toLocaleTimeString(ko?"ko-KR":"ja-JP",{hour:"2-digit",minute:"2-digit"})}
                      {nextUpdateMin!=null&&nextUpdateMin>0&&` · ${t("col.next_update")} ${nextUpdateMin}${ko?"분":"分"}`}
                    </span>
                  )}
                  <button onClick={fetchRankings} disabled={rankLoading}
                    style={{background:"none",border:`1px solid ${C.borderFaint}`,borderRadius:3,
                      color:rankLoading?C.stoneFaint:C.gold,cursor:rankLoading?"not-allowed":"pointer",
                      display:"flex",alignItems:"center",gap:4,padding:"3px 8px",fontFamily:FONT,fontSize:10,fontWeight:700}}>
                    <RefreshCw size={11} strokeWidth={2.5}/>
                    {t("col.refresh")}
                  </button>
                </div>
              </div>

              {rankings.length===0?(
                <p style={{fontFamily:FONT,fontSize:11,color:C.stoneFaint,textAlign:"center",padding:"24px 0",margin:0}}>
                  {rankLoading?t("col.loading"):t("col.no_records")}
                </p>
              ):(
                <div style={{maxHeight:340,overflowY:"auto"}}>
                  {rankings.map(entry=>{
                    const eIdx=getTierIdx(entry.tierPoints);
                    const eTier=TIERS[eIdx];
                    const isMe=entry.userId===user?.id;
                    const entryChar=entry.characterId!=null?(CHARACTERS.find(c=>c.id===entry.characterId)??CHARACTERS[0]):null;
                    const RankIcon=entry.rank===1?Crown:Medal;
                    const rankColor=entry.rank===1?"#ffd700":entry.rank===2?"#c0c0c0":entry.rank===3?"#cd7f32":C.stoneFaint;
                    return(
                      <div key={entry.userId} style={{
                        display:"flex",alignItems:"center",gap:10,padding:"7px 14px",
                        background:isMe?"#1e3a5f14":"transparent",
                        borderBottom:`1px solid ${C.borderFaint}`,
                        borderLeft:isMe?`3px solid #60a5fa`:`3px solid transparent`,
                      }}>
                        <div style={{width:24,textAlign:"center",flexShrink:0}}>
                          {entry.rank<=3
                            ?<RankIcon size={16} color={rankColor} strokeWidth={2}/>
                            :<span style={{fontFamily:"monospace",fontSize:12,fontWeight:900,color:rankColor}}>{entry.rank}</span>}
                        </div>
                        <div style={{width:32,height:32,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {entryChar
                            ?<PixelSprite type={entryChar.type} colors={entryChar.colors} characterId={entryChar.id} rarity={entryChar.rarity} size={32}/>
                            :<div style={{width:28,height:28,background:C.borderFaint,borderRadius:2}}/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontFamily:FONT,fontSize:12,fontWeight:900,
                            color:isMe?"#93c5fd":C.parchment,margin:0,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {entry.nickname}
                            {isMe&&<span style={{marginLeft:4,fontSize:9,color:"#60a5fa",
                              background:"#1e3a5f",padding:"1px 4px",borderRadius:2,fontWeight:900}}>
                              {t("col.me")}
                            </span>}
                          </p>
                          <p style={{fontFamily:FONT,fontSize:9,color:C.stone,margin:0}}>
                            {t("col.wins_summary").replace("{w}",String(entry.wins)).replace("{s}",String(entry.winStreak))}
                          </p>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,flexShrink:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <TierBadgeSvg idx={eIdx} size={14}/>
                            <span style={{fontFamily:FONT,fontSize:10,fontWeight:900,color:eTier.color}}>{ko?eTier.ko:eTier.ja}</span>
                          </div>
                          <span style={{fontFamily:"monospace",fontSize:10,color:C.stone}}>{entry.tierPoints} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 티어 목록 패널 ── */}
            <div style={{background:C.panel,border:`2px solid ${C.border}`,borderRadius:6,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",
                borderBottom:`1px solid ${C.borderFaint}`,background:"#130e05"}}>
                <Shield size={15} color={C.gold} strokeWidth={2}/>
                <span style={{fontFamily:FONT,fontSize:13,fontWeight:900,color:C.gold}}>{t("col.tier_list")}</span>
              </div>
              {TIERS.map((t2,i)=>{
                const nextMin=TIERS[i+1]?.min;
                const isCurrent=i===tierIdx;
                const ptRange=nextMin!=null
                  ?`${t2.min.toLocaleString()} ~ ${(nextMin-1).toLocaleString()}`
                  :`${t2.min.toLocaleString()}+`;
                return(
                  <div key={t2.key} style={{
                    display:"flex",alignItems:"center",gap:10,padding:"9px 14px",
                    background:isCurrent?`${t2.glow}18`:"transparent",
                    borderBottom:i<TIERS.length-1?`1px solid ${C.borderFaint}`:"none",
                    borderLeft:isCurrent?`3px solid ${t2.color}`:`3px solid transparent`,
                  }}>
                    <TierBadgeSvg idx={i} size={26}/>
                    <div style={{flex:1}}>
                      <p style={{fontFamily:FONT,fontSize:12,fontWeight:900,color:t2.color,
                        textShadow:isCurrent?`0 0 8px ${t2.glow}`:"none",margin:0,
                        display:"flex",alignItems:"center",gap:6}}>
                        {ko?t2.ko:t2.ja}
                        {isCurrent&&(
                          <span style={{fontSize:8,background:t2.color,color:"#000",
                            padding:"1px 4px",borderRadius:2,fontWeight:900,letterSpacing:"0.05em"}}>
                            {t("col.current")}
                          </span>
                        )}
                      </p>
                      <p style={{fontFamily:"monospace",fontSize:9,color:C.stone,margin:0}}>{ptRange} pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COIN
  // ══════════════════════════════════════════════════════════════════════════
  if(phase==="coin"){
    return(
      <><style>{cssStyles}</style>
      <CoinFlipScreen result={coinResult} playerFirst={battle?.playerGoesFirst??false}/></>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESULT
  // ══════════════════════════════════════════════════════════════════════════
  if(phase==="result"&&result){
    const newIdx=getTierIdx(result.tierPoints);
    const newTier=TIERS[newIdx];
    const newLabel=ko?newTier.ko:newTier.ja;
    const tierChanged=newIdx!==getTierIdx(result.tierPoints-result.pointsDelta);
    return(
      <div style={{position:"fixed",inset:0,zIndex:50,
        background:`linear-gradient(180deg,${result.won?"#0a1f06":"#1a0505"} 0%,#0c0905 100%)`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        gap:16,padding:"0 24px",fontFamily:FONT}}>
        <style>{cssStyles}</style>
        <p style={{fontFamily:FONT,fontWeight:900,fontSize:38,letterSpacing:"0.14em",textIndent:"0.14em",
          width:"100%",textAlign:"center",
          color:result.won?"#4ade80":"#f87171",
          textShadow:result.won?"0 0 30px #22c55e":"0 0 30px #ef4444",
          margin:0,animation:"col-win-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both"}}>
          {result.won?t("col.win"):t("col.lose")}
        </p>
        <TierBadgeSvg idx={newIdx} size={64}/>
        <p style={{fontFamily:FONT,fontSize:20,fontWeight:900,color:newTier.color,textShadow:`0 0 12px ${newTier.glow}`,margin:0}}>
          {newLabel}
        </p>
        {tierChanged&&(
          <p style={{fontFamily:FONT,fontSize:12,color:C.gold,margin:"-8px 0 0"}}>{t("col.tier_changed")}</p>
        )}
        <div style={{background:C.panelDark,border:`2px solid ${C.border}`,borderRadius:4,padding:"10px 24px",textAlign:"center"}}>
          <p style={{fontFamily:FONT,fontSize:22,fontWeight:900,margin:0,
            color:result.pointsDelta>=0?"#4ade80":"#f87171"}}>
            {result.pointsDelta>=0?"+":""}{result.pointsDelta} pts
          </p>
          <p style={{fontFamily:FONT,fontSize:12,color:C.stone,margin:"4px 0 0"}}>
            {t("col.total_pts")} {result.tierPoints} pts
          </p>
        </div>
        <div style={{display:"flex",gap:24,textAlign:"center"}}>
          {[
            {label:t("battle.wins"),val:result.wins,color:"#4ade80"},
            {label:t("battle.losses"),val:result.losses,color:"#f87171"},
            {label:t("battle.streak"),val:result.winStreak,color:C.gold},
          ].map(s=>(
            <div key={s.label}>
              <p style={{fontFamily:FONT,fontSize:22,fontWeight:900,color:s.color,margin:0}}>{s.val}</p>
              <p style={{fontFamily:FONT,fontSize:11,color:C.stone,margin:0}}>{s.label}</p>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,width:"100%",maxWidth:320,marginTop:8}}>
          <div style={{flex:1}}><PixelBtn onClick={reset} color="gray">{t("col.exit")}</PixelBtn></div>
          <div style={{flex:1}}><PixelBtn onClick={startBattle}>{t("col.rematch")}</PixelBtn></div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BATTLE ARENA
  // ══════════════════════════════════════════════════════════════════════════
  if(!battle)return null;
  const{player,opponent,turn,maxHp}=battle;
  const myTurn=turn==="player";
  const oppChar=charById(opponent.characterId);
  const plrChar=charById(player.characterId);
  const oppTheme=RARITY_THEME[oppChar.rarity];
  const plrTheme=RARITY_THEME[plrChar.rarity];

  const turnGlowStyle=(side:"player"|"opponent",baseAnim:string)=>({
    filter:turn===side
      ?`drop-shadow(0 0 12px ${side==="player"?plrTheme.glow:oppTheme.glow}) drop-shadow(0 0 24px ${side==="player"?plrTheme.glow:oppTheme.glow}88)`
      :"brightness(0.55)",
    animation:turn===side?`${baseAnim} 0.8s ease-in-out infinite,col-active-glow 1s ease-in-out infinite`:`${baseAnim} 2s ease-in-out infinite`,
    display:"inline-block" as const,
    transition:"filter 0.3s",
  });

  return(
    <div style={{position:"fixed",inset:0,zIndex:40,display:"flex",flexDirection:"column",
      background:C.bg,fontFamily:FONT,overflow:"hidden"}}>
      <style>{cssStyles}</style>

      {/* ── 헤더 (compact) ── */}
      <div style={{background:"linear-gradient(180deg,#1a1208 0%,#0c0905 100%)",
        borderBottom:`2px solid ${C.border}`,padding:"8px 14px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <button onClick={confirmForfeitAndExit} style={{background:"none",border:"none",color:C.stone,cursor:"pointer",
          fontFamily:FONT,fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:3}}>
          <ChevronLeft size={14}/>{t("col.exit")}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6,color:C.gold,fontWeight:900,fontSize:12,letterSpacing:"0.2em"}}>
          <Swords size={13} color={C.gold} strokeWidth={2.5}/>COLOSSEUM<Swords size={13} color={C.gold} strokeWidth={2.5}/>
        </div>
        <div style={{width:56}}/>
      </div>

      {/* ── 적 존 (가로 레이아웃) ── */}
      <div style={{background:C.enemyBg,borderBottom:`3px solid ${oppTheme.border}`,
        boxShadow:`0 10px 24px ${oppTheme.glow}22`,
        padding:"10px 52px 10px 52px",flexShrink:0,position:"relative",minHeight:0}}>
        <div style={{position:"absolute",inset:0,opacity:0.06,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 7px,#fff 7px,#fff 8px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:6,left:8}}><Torch/></div>
        <div style={{position:"absolute",top:6,right:8}}><Torch flip/></div>

        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* 적 정보 (왼쪽 — 가득 채움) */}
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:12,color:"#ef4444",margin:"0 0 4px",letterSpacing:"0.08em",fontWeight:700,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{opponent.nickname}</p>
            <HpBar hp={opponent.hp} maxHp={maxHp}/>
            <p style={{fontSize:10,color:"#9f1239",margin:"3px 0 0"}}>HP {opponent.hp} / {maxHp}</p>
          </div>
          {/* 적 스프라이트 (오른쪽) */}
          <div style={{position:"relative",flexShrink:0,width:72,display:"flex",justifyContent:"center"}}>
            <div style={{...turnGlowStyle("opponent","col-enemy-bob"),transform:"scaleX(-1)"}}>
              <PixelSprite type={oppChar.type} colors={oppChar.colors} characterId={oppChar.id} rarity={oppChar.rarity} size={64}/>
            </div>
            {dmgNums.filter(n=>n.side==="opponent").map(n=>(
              <span key={n.id} style={{position:"absolute",top:-6,left:"50%",transform:"translateX(-50%)",
                fontWeight:900,fontSize:20,color:C.gold,textShadow:`0 0 8px ${C.goldGlow}`,
                animation:"col-dmg-up 0.9s ease-out forwards",pointerEvents:"none",fontFamily:"monospace"}}>
                -{n.val}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── VS 분리선 (slim) ── */}
      <div style={{background:"linear-gradient(90deg,#1a0a00,#2d1800,#1a0a00)",height:22,
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
        borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,color:C.stoneFaint,fontWeight:900,fontSize:10,letterSpacing:"0.3em"}}>
          <Swords size={10} color={C.stoneFaint} strokeWidth={2}/>VS<Swords size={10} color={C.stoneFaint} strokeWidth={2}/>
        </div>
      </div>

      {/* ── 플레이어 존 (가로 레이아웃) ── */}
      <div style={{background:C.playerBg,borderTop:`3px solid ${plrTheme.border}`,
        boxShadow:`0 -10px 24px ${plrTheme.glow}22`,
        padding:"10px 52px 10px 52px",flexShrink:0,position:"relative",minHeight:0}}>
        <div style={{position:"absolute",inset:0,opacity:0.06,
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 7px,#fff 7px,#fff 8px)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:6,left:8}}><Torch/></div>
        <div style={{position:"absolute",bottom:6,right:8}}><Torch flip/></div>

        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* 플레이어 스프라이트 (왼쪽) */}
          <div style={{position:"relative",flexShrink:0,width:72,display:"flex",justifyContent:"center"}}>
            <div style={turnGlowStyle("player","col-idle-bob")}>
              <PixelSprite type={plrChar.type} colors={plrChar.colors} characterId={plrChar.id} rarity={plrChar.rarity} size={64}/>
            </div>
            {dmgNums.filter(n=>n.side==="player").map(n=>(
              <span key={n.id} style={{position:"absolute",top:-6,left:"50%",transform:"translateX(-50%)",
                fontWeight:900,fontSize:20,color:"#f87171",textShadow:"0 0 8px #ef4444",
                animation:"col-dmg-up 0.9s ease-out forwards",pointerEvents:"none",fontFamily:"monospace"}}>
                -{n.val}
              </span>
            ))}
          </div>
          {/* 플레이어 정보 (오른쪽) */}
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:12,color:"#60a5fa",margin:"0 0 4px",letterSpacing:"0.08em",fontWeight:700,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.nickname}</p>
            <HpBar hp={player.hp} maxHp={maxHp}/>
            <p style={{fontSize:10,color:"#1d4ed8",margin:"3px 0 0"}}>HP {player.hp} / {maxHp}</p>
          </div>
        </div>
      </div>

      {/* ── 중앙 배틀 이벤트 + 히스토리 ── */}
      <div style={{flex:1,background:"#080604",display:"flex",flexDirection:"column",
        gap:0,overflow:"hidden",borderTop:`1px solid ${C.borderFaint}`,borderBottom:`1px solid ${C.borderFaint}`}}>

        {/* 활성 이벤트 카드 (스크롤 없이 고정) */}
        <div style={{padding:"10px 12px 0",flexShrink:0}}>
          {rollAnimRolls.length>0
            ?<BattleEventCard
                rolls={rollAnimRolls} total={rollAnimTotal}
                attacker={rollAnimSide} isRolling={rollAnimActive}
                battle={battle!}/>
            :<div style={{
                background:"#0d0b07",border:`1px solid ${C.borderFaint}`,
                borderRadius:4,padding:"12px 14px",
                display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                color:C.stone,fontFamily:FONT,fontSize:12,letterSpacing:"0.08em",
              }}>
                <Swords size={13} color={C.stoneFaint} strokeWidth={2}/>
                {logText||t("col.battle_start")}
              </div>}
        </div>

        {/* 배틀 히스토리 (아래에서 위로 쌓임) */}
        {battleHistory.length>0&&(
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",
            justifyContent:"flex-end",gap:4,padding:"8px 12px 10px",minHeight:0}}>
            {[...battleHistory].slice(-6).map((entry,i,arr)=>(
              <BattleHistoryRow key={entry.id} entry={entry}
                opacity={arr.length===1?1:Math.max(0.25,0.25+(i/(arr.length-1))*0.75)}
                maxHp={battle?.maxHp??MAX_HP}/>
            ))}
          </div>
        )}
      </div>

      {/* ── 액션 패널 (compact) ── */}
      <div style={{background:"linear-gradient(180deg,#0d0a04 0%,#170f05 100%)",
        borderTop:`2px solid ${C.border}`,padding:"10px 14px 16px",flexShrink:0}}>
        {waitForNext?(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <p style={{textAlign:"center",fontSize:11,color:"#94a3b8",fontWeight:700,
              letterSpacing:"0.08em",margin:"0 0 4px",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              <Shield size={11} color="#94a3b8" strokeWidth={2}/>{ko?"공격 결과 확인 — 다음을 눌러 상대 턴 시작":"攻撃結果確認 — 次で相手ターン開始"}
            </p>
            <PixelBtn onClick={ackOpponentTurn} color="gray">
              <Dices size={16}/>{t("col.next_turn")}
            </PixelBtn>
          </div>
        ):myTurn?(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <p style={{textAlign:"center",fontSize:11,color:C.gold,fontWeight:700,
              letterSpacing:"0.12em",margin:"0 0 4px",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              <Swords size={11} color={C.gold} strokeWidth={2.5}/>{t("col.attack_turn")}
            </p>
            <PixelBtn onClick={rollDice} disabled={rolling}>
              {rolling?<><Dices size={16}/>{t("col.rolling")}</>:<><Swords size={18} strokeWidth={2.5}/>{t("col.attack")}</>}
            </PixelBtn>
          </div>
        ):(
          <div style={{textAlign:"center",padding:"10px 0",color:C.stone,fontSize:13,
            fontWeight:700,letterSpacing:"0.08em",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <Dices size={14} color={C.stone}/>{t("col.wait_opp")}
          </div>
        )}
      </div>
    </div>
  );
}
