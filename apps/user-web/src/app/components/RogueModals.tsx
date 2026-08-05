import { Award, Crown, Sparkles, X } from "lucide-react";
import type { Lang } from "../lib/i18n";
import type { RogueMilestone } from "../types/domain";
import {
  CardView,
  RelicCombatIcon,
  RelicRewardIcon,
  RelicUtilityIcon,
  type CardInstance,
  type GameState,
  type RelicCategory,
  type RelicDef,
  type RelicGrade,
} from "./RogueGameData";

// RoguePage.tsx 안에 클로저로 정의돼 있던 모달 컴포넌트들(덱/기물 보기, 기물·카드
// 교체, 탈주 확인, 마일스톤 목록)을 분리한 파일. 컴포넌트가 다른 컴포넌트 안에서
// 정의되면 렌더될 때마다 새로 만들어져 불필요한 리마운트가 생길 수 있어 최상위로 뺐다.
// 원래 클로저로 참조하던 값(gs, C, ko, ja, FONT 등)은 전부 명시적 props로 바뀌었을 뿐
// 내부 JSX/로직은 그대로다.

export interface ThemeColors {
  panel: string;
  panelDark: string;
  border: string;
  textBright: string;
  textDim: string;
  gold: string;
  red: string;
}

interface DeckModalProps {
  gs: GameState | null;
  deckOpen: boolean;
  setDeckOpen: (v: boolean) => void;
  C: ThemeColors;
  FONT: string;
  ko: boolean;
  ja: boolean;
  lang: Lang;
}

interface RelicModalProps {
  gs: GameState | null;
  relicOpen: boolean;
  setRelicOpen: (v: boolean) => void;
  C: ThemeColors;
  FONT: string;
  ko: boolean;
  ja: boolean;
}

interface RelicOfferModalProps {
  pendingRelicOffer: RelicDef[] | null;
  pendingRelicSwap: RelicDef | null;
  C: ThemeColors;
  FONT: string;
  ko: boolean;
  ja: boolean;
  handlePickRelic: (relic: RelicDef) => void;
  handleSkipRelic: () => void;
}

interface RelicSwapModalProps {
  pendingRelicSwap: RelicDef | null;
  gs: GameState | null;
  C: ThemeColors;
  FONT: string;
  ko: boolean;
  ja: boolean;
  handleRelicSwap: (idx: number) => void;
  handleRelicSwapSkip: () => void;
}

interface CardSwapModalProps {
  pendingCardSwap: CardInstance | null;
  gs: GameState | null;
  C: ThemeColors;
  FONT: string;
  ko: boolean;
  ja: boolean;
  lang: Lang;
  handleCardSwap: (idx: number) => void;
  handleCardSwapSkip: () => void;
}

interface QuitConfirmModalProps {
  confirmQuit: boolean;
  setConfirmQuit: (v: boolean) => void;
  C: ThemeColors;
  FONT: string;
  ko: boolean;
  ja: boolean;
  abandonRun: () => void;
}

export interface GlobalModalsProps {
  gs: GameState | null;
  C: ThemeColors;
  FONT: string;
  ko: boolean;
  ja: boolean;
  lang: Lang;
  relicOpen: boolean;
  setRelicOpen: (v: boolean) => void;
  pendingRelicOffer: RelicDef[] | null;
  pendingRelicSwap: RelicDef | null;
  pendingCardSwap: CardInstance | null;
  confirmQuit: boolean;
  setConfirmQuit: (v: boolean) => void;
  handlePickRelic: (relic: RelicDef) => void;
  handleSkipRelic: () => void;
  handleRelicSwap: (idx: number) => void;
  handleRelicSwapSkip: () => void;
  handleCardSwap: (idx: number) => void;
  handleCardSwapSkip: () => void;
  abandonRun: () => void;
}

export const DeckModal = ({ gs, deckOpen, setDeckOpen, C, FONT, ko, ja, lang }: DeckModalProps) => {
    if (!gs || !deckOpen) return null;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "#000a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => setDeckOpen(false)}
      >
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
            width: "min(560px,94vw)",
            maxHeight: "80vh",
            overflow: "auto",
            fontFamily: FONT,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <p
              style={{
                margin: 0,
                color: C.textBright,
                fontWeight: 800,
                fontSize: 15,
              }}
            >
              {ko ? "덱 보기" : ja ? "デッキ確認" : "Deck"} ({gs.deck.length}
              {ko ? "장" : ja ? "枚" : " cards"})
            </p>
            <button
              onClick={() => setDeckOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.textDim,
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {gs.deck.map((c, i) => (
              <CardView key={c.uid ?? i} card={c} canPlay={false} lang={lang} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Relic grade colors ───────────────────────────────────────────────────
export const RELIC_GRADE_COLOR: Record<RelicGrade, string> = {
    common: "#64748b",
    rare: "#2563eb",
    unique: "#a855f7",
    boss: "#ef4444",
  };
export const RELIC_GRADE_LABEL = (g: RelicGrade, ko: boolean, ja: boolean) =>
    g === "common"
      ? ko ? "커먼" : ja ? "コモン" : "Common"
      : g === "rare"
        ? ko ? "레어" : ja ? "レア" : "Rare"
        : g === "unique"
          ? ko ? "유니크" : ja ? "ユニーク" : "Unique"
          : ko ? "저주" : ja ? "呪い" : "Cursed";
export const RELIC_CAT_LABEL = (c: RelicCategory, ko: boolean, ja: boolean) =>
    c === "combat"
      ? ko
        ? "전투형"
        : ja
          ? "戦闘型"
          : "Combat"
      : c === "utility"
        ? ko
          ? "유틸형"
          : ja
            ? "ユーティリティ"
            : "Utility"
        : ko
          ? "보상형"
          : ja
            ? "報酬型"
            : "Reward";

  // ── Relic card view ──────────────────────────────────────────────────────
export const RelicCard = ({
    relic,
    size = "md",
    onClick,
    selected,
    ko,
    ja,
  }: {
    relic: RelicDef;
    size?: "sm" | "md";
    onClick?: () => void;
    selected?: boolean;
    ko: boolean;
    ja: boolean;
  }) => {
    const gc = RELIC_GRADE_COLOR[relic.grade];
    const relicName = ko ? relic.name : ja ? relic.nameJa : relic.nameEn;
    const relicDesc = ko ? relic.desc : ja ? relic.descJa : relic.descEn;
    const CatIcon =
      relic.category === "combat"
        ? () => <RelicCombatIcon size={size === "sm" ? 18 : 22} color={gc} />
        : relic.category === "utility"
          ? () => <RelicUtilityIcon size={size === "sm" ? 18 : 22} color={gc} />
          : () => <RelicRewardIcon size={size === "sm" ? 18 : 22} color={gc} />;
    return (
      <div
        onClick={onClick}
        style={{
          borderRadius: 10,
          border: `2px solid ${selected ? "#facc15" : gc}`,
          background: `${gc}14`,
          padding: size === "sm" ? "8px 10px" : "12px 14px",
          cursor: onClick ? "pointer" : "default",
          boxShadow: selected ? `0 0 16px #facc1566` : `0 0 8px ${gc}33`,
          transition: "all 0.12s",
          minWidth: size === "sm" ? 120 : 160,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <CatIcon />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: size === "sm" ? 11 : 13,
                fontWeight: 800,
                color: "#e2e8f0",
                lineHeight: 1.2,
              }}
            >
              {relicName}
            </p>
            <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: gc,
                  background: `${gc}22`,
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                {RELIC_GRADE_LABEL(relic.grade, ko, ja)}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#94a3b8",
                  background: "#94a3b822",
                  borderRadius: 3,
                  padding: "1px 5px",
                }}
              >
                {RELIC_CAT_LABEL(relic.category, ko, ja)}
              </span>
            </div>
          </div>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: size === "sm" ? 10 : 11,
            color: "#94a3b8",
            lineHeight: 1.4,
          }}
        >
          {relicDesc}
        </p>
      </div>
    );
  };

  // ── Relic modal (view owned) ──────────────────────────────────────────────
export const RelicModal = ({ gs, relicOpen, setRelicOpen, C, FONT, ko, ja }: RelicModalProps) => {
    if (!gs || !relicOpen) return null;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "#000a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => setRelicOpen(false)}
      >
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
            width: "min(540px,94vw)",
            maxHeight: "80vh",
            overflow: "auto",
            fontFamily: FONT,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#a855f7",
                fontWeight: 800,
                fontSize: 15,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={15} />
              {ko ? "기물 보기" : ja ? "遺物確認" : "Relics"} (
              {gs.relics.length}/5{gs.cursedRelic ? (ko ? " + 저주1" : ja ? " +呪1" : " +curse") : ""})
            </p>
            <button
              onClick={() => setRelicOpen(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.textDim,
              }}
            >
              <X size={18} />
            </button>
          </div>
          {gs.relics.length === 0 ? (
            <p
              style={{
                color: C.textDim,
                fontSize: 13,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              {ko
                ? "보유한 기물이 없습니다"
                : ja
                  ? "所持している遺物がありません"
                  : "No relics held"}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {gs.relics.map((r) => (
                <RelicCard key={r.id} relic={r} ko={ko} ja={ja} />
              ))}
              {gs.cursedRelic && (
                <div>
                  <p style={{ margin: "8px 0 4px", fontSize: 11, color: "#ef4444", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <Crown size={11} color="#ef4444" />
                    {ko ? "저주 기물" : ja ? "呪い遺物" : "Cursed Relic"}
                  </p>
                  <RelicCard relic={gs.cursedRelic} ko={ko} ja={ja} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Relic offer modal ─────────────────────────────────────────────────────
export const RelicOfferModal = ({ pendingRelicOffer, pendingRelicSwap, C, FONT, ko, ja, handlePickRelic, handleSkipRelic }: RelicOfferModalProps) => {
    if (!pendingRelicOffer || pendingRelicSwap) return null;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 998,
          background: "#000c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            background: C.panel,
            border: "2px solid #a855f744",
            borderRadius: 14,
            padding: 24,
            width: "min(500px,94vw)",
            animation: "rogue-in 0.25s ease-out both",
          }}
        >
          {(() => {
            const isCurseOffer = pendingRelicOffer?.some(r => r.grade === "boss");
            return (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 900, color: isCurseOffer ? "#ef4444" : "#a855f7", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  {isCurseOffer ? <Crown size={20} color="#ef4444" /> : <Sparkles size={20} color="#a855f7" />}
                  {isCurseOffer
                    ? (ko ? "저주 기물 획득" : ja ? "呪い遺物獲得" : "Cursed Relic Found")
                    : (ko ? "기물 획득" : ja ? "遺物獲得" : "Relic Found")}
                </p>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: isCurseOffer ? "#fca5a5" : C.textDim, textAlign: "center" }}>
                  {isCurseOffer
                    ? (ko ? "강력하지만 저주가 따릅니다 — 1개 선택 (별도 슬롯)" : ja ? "強力だが呪いあり — 別スロット" : "Powerful but cursed — fills separate slot")
                    : (ko ? "1개를 선택해 보유하세요 (최대 5개)" : ja ? "1つ選んで所持してください（最大5個）" : "Pick 1 to keep (max 5 relics)")}
                </p>
              </>
            );
          })()}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pendingRelicOffer.map((r) => (
              <RelicCard
                key={r.id}
                relic={r}
                onClick={() => handlePickRelic(r)}
                ko={ko}
                ja={ja}
              />
            ))}
          </div>
          <button
            onClick={handleSkipRelic}
            style={{
              marginTop: 14,
              width: "100%",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 0",
              color: C.textDim,
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13,
            }}
          >
            {ko ? "획득 포기" : ja ? "取得スキップ" : "Skip"}
          </button>
        </div>
      </div>
    );
  };

  // ── Relic swap modal (when holding 5 relics) ──────────────────────────────
export const RelicSwapModal = ({ pendingRelicSwap, gs, C, FONT, ko, ja, handleRelicSwap, handleRelicSwapSkip }: RelicSwapModalProps) => {
    if (!pendingRelicSwap || !gs) return null;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "#000d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            background: C.panel,
            border: "2px solid #f59e0b44",
            borderRadius: 14,
            padding: 24,
            width: "min(560px,94vw)",
            maxHeight: "90vh",
            overflow: "auto",
            animation: "rogue-in 0.25s ease-out both",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 18,
              fontWeight: 900,
              color: C.gold,
              textAlign: "center",
            }}
          >
            {ko ? "기물 교체" : ja ? "遺物交換" : "Swap Relic"}
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.textDim,
              textAlign: "center",
            }}
          >
            {ko ? "새 기물:" : ja ? "新遺物:" : "New relic:"}
          </p>
          <div style={{ marginBottom: 14 }}>
            <RelicCard relic={pendingRelicSwap} ko={ko} ja={ja} />
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textDim }}>
            {ko
              ? "교체할 기물을 선택하세요 (최대 5개 초과)"
              : ja
                ? "交換する遺物を選択してください"
                : "Choose a relic to replace:"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gs.relics.map((r, i) => (
              <RelicCard
                key={r.id}
                relic={r}
                onClick={() => handleRelicSwap(i)}
                ko={ko}
                ja={ja}
              />
            ))}
          </div>
          <button
            onClick={handleRelicSwapSkip}
            style={{
              marginTop: 14,
              width: "100%",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 0",
              color: C.textDim,
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13,
            }}
          >
            {ko ? "획득 포기" : ja ? "取得スキップ" : "Skip"}
          </button>
        </div>
      </div>
    );
  };

  // ── Card swap modal (deck full = 20 cards) ────────────────────────────────
export const CardSwapModal = ({ pendingCardSwap, gs, C, FONT, ko, ja, lang, handleCardSwap, handleCardSwapSkip }: CardSwapModalProps) => {
    if (!pendingCardSwap || !gs) return null;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "#000d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            background: C.panel,
            border: "2px solid #f59e0b44",
            borderRadius: 14,
            padding: 20,
            width: "min(600px,96vw)",
            maxHeight: "90vh",
            overflow: "auto",
            animation: "rogue-in 0.25s ease-out both",
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 18,
              fontWeight: 900,
              color: C.gold,
              textAlign: "center",
            }}
          >
            {ko
              ? "덱이 가득 찼습니다 (20/20)"
              : ja
                ? "デッキが満杯です（20/20）"
                : "Deck Full (20/20)"}
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              color: C.textDim,
              textAlign: "center",
            }}
          >
            {ko ? "새 카드:" : ja ? "新カード:" : "New card:"}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <CardView card={pendingCardSwap} canPlay={false} lang={lang} />
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textDim }}>
            {ko
              ? "교체할 카드를 선택하세요"
              : ja
                ? "交換するカードを選択"
                : "Click a card in your deck to replace it:"}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              maxHeight: "320px",
              overflowY: "auto",
            }}
          >
            {gs.deck.map((c, i) => (
              <div
                key={c.uid ?? i}
                onClick={() => handleCardSwap(i)}
                style={{
                  cursor: "pointer",
                  opacity: 1,
                  transition: "opacity 0.12s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <CardView card={c} canPlay={false} lang={lang} />
              </div>
            ))}
          </div>
          <button
            onClick={handleCardSwapSkip}
            style={{
              marginTop: 14,
              width: "100%",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "8px 0",
              color: C.textDim,
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13,
            }}
          >
            {ko ? "획득 포기" : ja ? "取得スキップ" : "Skip"}
          </button>
        </div>
      </div>
    );
  };

  // ── Quit confirm modal ────────────────────────────────────────────────────
export const QuitConfirmModal = ({ confirmQuit, setConfirmQuit, C, FONT, ko, ja, abandonRun }: QuitConfirmModalProps) => {
    if (!confirmQuit) return null;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1100,
          background: "#000c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            background: C.panel,
            border: `2px solid ${C.red}66`,
            borderRadius: 14,
            padding: "28px 32px",
            width: "min(340px,90vw)",
            textAlign: "center",
            animation: "rogue-in 0.2s ease-out both",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 900, color: C.red }}>
            {ko ? "탐험 포기" : ja ? "探険を放棄" : "Abandon Run"}
          </p>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: C.textDim }}>
            {ko
              ? "현재 탐험을 포기하시겠습니까? 진행 상황은 저장되지 않습니다."
              : ja
                ? "現在の探険を放棄しますか？進行状況は保存されません。"
                : "Are you sure you want to abandon this run? Progress will not be saved."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => setConfirmQuit(false)}
              style={{
                background: C.panelDark,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 22px",
                color: C.textDim,
                cursor: "pointer",
                fontFamily: FONT,
                fontSize: 14,
              }}
            >
              {ko ? "취소" : ja ? "キャンセル" : "Cancel"}
            </button>
            <button
              onClick={() => { setConfirmQuit(false); abandonRun(); }}
              style={{
                background: "#3a0e0e",
                border: `2px solid ${C.red}`,
                borderRadius: 8,
                padding: "10px 22px",
                color: C.red,
                cursor: "pointer",
                fontFamily: FONT,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              {ko ? "포기" : ja ? "放棄" : "Quit"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Global overlays (shown on top of any phase) ───────────────────────────
export const GlobalModals = (props: GlobalModalsProps) => (
    <>
      <CardSwapModal
        pendingCardSwap={props.pendingCardSwap}
        gs={props.gs}
        C={props.C}
        FONT={props.FONT}
        ko={props.ko}
        ja={props.ja}
        lang={props.lang}
        handleCardSwap={props.handleCardSwap}
        handleCardSwapSkip={props.handleCardSwapSkip}
      />
      <RelicSwapModal
        pendingRelicSwap={props.pendingRelicSwap}
        gs={props.gs}
        C={props.C}
        FONT={props.FONT}
        ko={props.ko}
        ja={props.ja}
        handleRelicSwap={props.handleRelicSwap}
        handleRelicSwapSkip={props.handleRelicSwapSkip}
      />
      <RelicOfferModal
        pendingRelicOffer={props.pendingRelicOffer}
        pendingRelicSwap={props.pendingRelicSwap}
        C={props.C}
        FONT={props.FONT}
        ko={props.ko}
        ja={props.ja}
        handlePickRelic={props.handlePickRelic}
        handleSkipRelic={props.handleSkipRelic}
      />
      <RelicModal
        gs={props.gs}
        relicOpen={props.relicOpen}
        setRelicOpen={props.setRelicOpen}
        C={props.C}
        FONT={props.FONT}
        ko={props.ko}
        ja={props.ja}
      />
      <QuitConfirmModal
        confirmQuit={props.confirmQuit}
        setConfirmQuit={props.setConfirmQuit}
        C={props.C}
        FONT={props.FONT}
        ko={props.ko}
        ja={props.ja}
        abandonRun={props.abandonRun}
      />
    </>
  );

  // 마일스톤 보상 목록 (도전/스토리 공용)
export const MilestoneList = ({
    milestones,
    labelOf,
    C,
    ko,
    ja,
  }: {
    milestones: RogueMilestone[];
    labelOf: (n: number) => string;
    C: ThemeColors;
    ko: boolean;
    ja: boolean;
  }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        maxWidth: 360,
        animation: "rogue-in 0.4s 0.1s ease-out both",
      }}
    >
      {milestones.map((m, i) => (
        <div
          key={i}
          style={{
            background: "#0a1a0a",
            border: "1px solid #22c55e44",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <p
            style={{
              margin: "0 0 7px",
              fontSize: 13,
              fontWeight: 800,
              color: "#22c55e",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Award size={14} color="#22c55e" />
            {labelOf(m.clears)}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {m.points > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.gold,
                  background: `${C.gold}15`,
                  border: `1px solid ${C.gold}44`,
                  borderRadius: 5,
                  padding: "2px 8px",
                }}
              >
                {ko ? "포인트" : ja ? "ポイント" : "Points"} ×
                {m.points.toLocaleString()}
              </span>
            )}
            {m.stones > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#60a5fa",
                  background: "#60a5fa15",
                  border: "1px solid #60a5fa44",
                  borderRadius: 5,
                  padding: "2px 8px",
                }}
              >
                {ko ? "강화석" : ja ? "強化石" : "Upgrade Stone"} ×{m.stones}
              </span>
            )}
            {m.normalEgg > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94a3b8",
                  background: "#94a3b815",
                  border: "1px solid #94a3b844",
                  borderRadius: 5,
                  padding: "2px 8px",
                }}
              >
                {ko ? "일반 알" : ja ? "通常卵" : "Normal Egg"} ×{m.normalEgg}
              </span>
            )}
            {m.bigEgg > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#4ade80",
                  background: "#4ade8015",
                  border: "1px solid #4ade8044",
                  borderRadius: 5,
                  padding: "2px 8px",
                }}
              >
                {ko ? "고급 알" : ja ? "上級卵" : "Premium Egg"} ×{m.bigEgg}
              </span>
            )}
            {m.goldEgg > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.gold,
                  background: `${C.gold}15`,
                  border: `1px solid ${C.gold}44`,
                  borderRadius: 5,
                  padding: "2px 8px",
                }}
              >
                {ko ? "황금 알" : ja ? "黄金卵" : "Golden Egg"} ×{m.goldEgg}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
