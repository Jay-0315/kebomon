import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Swords,
  Sword,
  Bot,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift,
  History,
  PlayCircle,
  Loader2,
  Plus,
  Ticket,
} from "lucide-react";
import { getStoredUser } from "../lib/auth";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import {
  type CharacterRarity,
  type CharacterType,
} from "../data/characters";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";
import BattleReplay, { RARITY_THEME, ELEMENT_COLOR } from "./BattleReplay";

import {
  SEASON,
  TIERS,
  C,
  FONT,
  NpcOpponent,
  NPC_OPPONENTS,
  useNpcCooldowns,
  MAX_TICKETS,
  useTickets,
  getTierIdx,
  charById,
  RankingEntry,
  RevengeTarget,
  BattleHistoryEntry,
  BattleResult,
  CSS,
  ARCHETYPE_LABEL,
  ArchetypeIcon,
  Torch,
  ArenaFlag,
  ArenaGate,
  TierBadgeSvg,
  DeckSlotCard,
  SeasonRewardModal,
  PixelBtn,
  DeckEditor,
  FeedbackToast,
  ReplaySummaryCard,
  Phase,
} from "./ColosseumContent";

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function ColosseumPage() {
  const { rewardSummary } = useAppData();
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const user = getStoredUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 세션 상태
  const [phase, setPhase] = useState<Phase>("lobby");
  const [lobbyTab, setLobbyTab] = useState<"battle" | "deck" | "ai">("battle");
  const [showSeason, setShowSeason] = useState(false);

  // 내 스탯 / 덱
  const [tierPts, setTierPts] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, winStreak: 0 });
  const [myAtkSlots, setMyAtkSlots] = useState<number[]>([]);
  const [myDefSlots, setMyDefSlots] = useState<number[]>([]);

  // 덱 편집
  const [editingDeckType, setEditingDeckType] = useState<"attack" | "defense">(
    "attack",
  );

  // 공격 확인
  const [targetUser, setTargetUser] = useState<{
    userId: string;
    nickname: string;
    tierPoints: number;
  } | null>(null);
  const [targetDefSlots, setTargetDefSlots] = useState<number[]>([]);
  const [npcTarget, setNpcTarget] = useState<NpcOpponent | null>(null);

  // 배틀 / 결과
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  // 랭킹
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [rankPage, setRankPage] = useState(0);
  const [rankLoading, setRankLoading] = useState(false);
  const [tierFilter, setTierFilter] = useState<number | null>(null); // null = 전체

  // 복수 목록
  const [revengeTargets, setRevengeTargets] = useState<RevengeTarget[]>([]);
  const [revengeOpen, setRevengeOpen] = useState(false);

  // 전투 기록 / 리플레이
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHighlightId, setHistoryHighlightId] = useState<string | null>(
    null,
  );
  const [replayResult, setReplayResult] = useState<BattleResult | null>(null);
  const [replayPhase, setReplayPhase] = useState<"playing" | "summary">(
    "playing",
  );
  const [replayLoadingId, setReplayLoadingId] = useState<string | null>(null);

  const { tickets, msToNext, fmtMs, consume, refund, applyServer } = useTickets(user?.id);
  const { isOnCooldown, getRemainingMs, applyCooldown } = useNpcCooldowns();

  // 액션 실패 피드백 토스트
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const ownedIds = rewardSummary.ownedCharacterIds ?? [];
  const colCopy = {
    autoDeck: ko ? "추천 편성" : ja ? "おすすめ編成" : "Auto Deck",
    risk: ko ? "위험도" : ja ? "危険度" : "Risk",
    riskLow: ko ? "낮음" : ja ? "低" : "Low",
    riskMid: ko ? "보통" : ja ? "中" : "Mid",
    riskHigh: ko ? "높음" : ja ? "高" : "High",
    seasonReward: ko ? "시즌 보상" : ja ? "シーズン報酬" : "Season Rewards",
    seasonDesc:
      ko
        ? "티어 점수와 연승 기록을 기준으로 시즌 종료 보상과 전시 보상이 정리됩니다."
        : ja
          ? "ティアポイントと連勝記録を基準にシーズン終了報酬を表示します。"
          : "Season rewards are based on tier points and win streak records.",
    logGuide: ko ? "전투 로그는 피해, 치명타, 승패 변화를 시간순으로 확인합니다." : ja ? "戦闘ログでダメージ、クリティカル、勝敗の流れを時系列で確認します。" : "Battle logs show damage, crits, and result changes in order.",
  };

  // ── 내 데이터 로드 ──
  const fetchMyData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<{
        attackSlots: number[];
        defenseSlots: number[];
        tierPoints: number;
        wins: number;
        losses: number;
        winStreak: number;
      }>(`/arena/my?userId=${encodeURIComponent(user.id)}`);
      setMyAtkSlots(res.attackSlots);
      setMyDefSlots(res.defenseSlots);
      setTierPts(res.tierPoints);
      setStats({
        wins: res.wins,
        losses: res.losses,
        winStreak: res.winStreak,
      });
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const fetchRankings = useCallback(async () => {
    setRankLoading(true);
    try {
      const res = await api.get<{ rankings: RankingEntry[] }>(
        "/rewards/colosseum-rankings",
      );
      setRankings(res.rankings);
    } catch {
      /* silent */
    }
    setRankLoading(false);
  }, []);

  const fetchRevengeTargets = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<RevengeTarget[]>(
        `/arena/revenge/${encodeURIComponent(user.id)}`,
      );
      setRevengeTargets(res);
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const fetchBattleHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<BattleHistoryEntry[]>(
        `/arena/history/${encodeURIComponent(user.id)}`,
      );
      setBattleHistory(res);
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const openReplay = useCallback(
    async (battleId: string) => {
      if (!user?.id) return;
      setReplayLoadingId(battleId);
      try {
        const res = await api.get<BattleResult>(
          `/arena/replay/${encodeURIComponent(battleId)}?userId=${encodeURIComponent(user.id)}`,
        );
        setReplayResult(res);
        setReplayPhase("playing");
        setHistoryOpen(true);
        setHistoryHighlightId(battleId);
        setTimeout(
          () => setHistoryHighlightId((cur) => (cur === battleId ? null : cur)),
          4000,
        );
      } catch {
        showToast(
          ko
            ? "리플레이를 불러오지 못했습니다."
            : ja
              ? "リプレイの読み込みに失敗しました。"
              : "Failed to load replay.",
        );
      }
      setReplayLoadingId(null);
    },
    [user?.id, ko, ja, showToast],
  );

  useEffect(() => {
    fetchMyData();
    fetchRankings();
    fetchRevengeTargets();
    fetchBattleHistory();
  }, [fetchMyData, fetchRankings, fetchRevengeTargets, fetchBattleHistory]);

  // 알림 딥링크 — ?battleId=123 으로 진입 시 자동으로 해당 전투 리플레이 오픈
  useEffect(() => {
    const battleId = searchParams.get("battleId");
    if (battleId) {
      openReplay(battleId);
      const next = new URLSearchParams(searchParams);
      next.delete("battleId");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── 덱 저장 ──
  const saveDeck = async (deckType: "attack" | "defense", slots: number[]) => {
    if (!user?.id) return;
    try {
      await api.put("/arena/deck", { userId: user.id, deckType, slots });
      if (deckType === "attack") setMyAtkSlots(slots);
      else setMyDefSlots(slots);
      setPhase("lobby");
    } catch {
      showToast(
        ko
          ? "덱 저장에 실패했습니다. 다시 시도해주세요."
          : ja
            ? "デッキの保存に失敗しました。もう一度お試しください。"
            : "Failed to save deck. Please try again.",
      );
    }
  };

  const autoFillDeck = async (deckType: "attack" | "defense") => {
    const rarityRank: Record<string, number> = {
      mythic: 6,
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };
    const recommended = [...ownedIds]
      .filter(Boolean)
      .sort((a, b) => {
        const ca = charById(a);
        const cb = charById(b);
        const rarityDelta = (rarityRank[cb.rarity] ?? 0) - (rarityRank[ca.rarity] ?? 0);
        if (rarityDelta !== 0) return rarityDelta;
        return a - b;
      })
      .slice(0, 4);
    if (recommended.length === 0) {
      showToast(ko ? "편성할 보유 케보몬이 없습니다." : ja ? "編成できる所持キャラがありません。" : "No owned characters to recommend.");
      return;
    }
    await saveDeck(deckType, recommended);
  };

  // ── 공격 확인 (실제 플레이어) ──
  const startAttackConfirm = async (target: RankingEntry) => {
    try {
      const res = await api.get<{ slots: number[]; defenderName: string }>(
        `/arena/defense/${encodeURIComponent(target.userId)}`,
      );
      setTargetUser({
        userId: target.userId,
        nickname: target.nickname,
        tierPoints: target.tierPoints,
      });
      setTargetDefSlots(res.slots);
      setNpcTarget(null);
      setPhase("attack-confirm");
    } catch {
      /* silent */
    }
  };

  // ── 공격 확인 (NPC) ──
  const startNpcAttackConfirm = (npc: NpcOpponent) => {
    setTargetUser({
      userId: npc.id,
      nickname: ko ? npc.nameKo : ja ? npc.nameJa : npc.nameEn,
      tierPoints: npc.fakePts,
    });
    setTargetDefSlots(npc.slots);
    setNpcTarget(npc);
    setPhase("attack-confirm");
  };

  // ── 배틀 실행 ──
  const startBattle = async () => {
    if (!user?.id || !targetUser) return;
    if (!consume()) return;
    setPhase("battle");
    try {
      let res: BattleResult;
      if (npcTarget) {
        res = await api.post<BattleResult>("/arena/attack-npc", {
          userId: user.id,
          npcId: npcTarget.id,
        });
      } else {
        res = await api.post<BattleResult>(
          `/arena/attack/${encodeURIComponent(targetUser.userId)}`,
          { userId: user.id },
        );
      }
      setBattleResult(res);
      setTierPts(res.tierPoints);
      setStats({
        wins: res.wins,
        losses: res.losses,
        winStreak: res.winStreak,
      });
      if (res.tickets !== undefined) applyServer(res.tickets, res.ticketRegenAt);
      if (res.won && npcTarget) applyCooldown(npcTarget.id);
      if (!npcTarget) fetchBattleHistory(); // 실제 유저 전투만 기록에 남음
    } catch {
      refund();
      setPhase("lobby");
      showToast(
        ko
          ? "전투 시작에 실패했습니다. 티켓이 반환되었습니다."
          : ja
            ? "バトル開始に失敗しました。チケットを返却しました。"
            : "Failed to start the battle. Your ticket was refunded.",
      );
    }
  };

  // ── 페이즈별 렌더 ──────────────────────────────────────────────────────────

  // 전투 기록 리플레이 (현재 phase와 무관하게 최우선 표시)
  if (replayResult) {
    if (replayPhase === "summary") {
      return (
        <ReplaySummaryCard
          result={replayResult}
          ko={ko}
          ja={ja}
          onClose={() => {
            setReplayResult(null);
            setReplayPhase("playing");
          }}
        />
      );
    }
    return (
      <BattleReplay
        result={replayResult}
        onDone={() => setReplayPhase("summary")}
      />
    );
  }

  // 덱 편집
  if (phase === "deck-edit") {
    return (
      <>
        <DeckEditor
          deckType={editingDeckType}
          currentSlots={editingDeckType === "attack" ? myAtkSlots : myDefSlots}
          ownedIds={ownedIds}
          onSave={(slots) => saveDeck(editingDeckType, slots)}
          onBack={() => setPhase("lobby")}
          ko={ko}
          ja={ja}
          charEnhancements={rewardSummary.characterEnhancements ?? {}}
        />
        <FeedbackToast text={toast} />
      </>
    );
  }

  // 배틀 재생
  if (phase === "battle" && battleResult) {
    return (
      <BattleReplay result={battleResult} onDone={() => setPhase("result")} />
    );
  }

  // 결과 화면
  if (phase === "result" && battleResult) {
    const won = battleResult.won;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 20,
        }}
      >
        <style>{CSS}</style>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: "'Courier New',monospace",
              fontSize: 44,
              fontWeight: 900,
              color: won ? "#ffd700" : "#f87171",
              textShadow: won ? "0 0 30px #ffd700" : "0 0 20px #ef4444",
              margin: "0 0 8px",
              animation: "col-win-in 0.6s ease-out both",
              letterSpacing: "0.12em",
            }}
          >
            {won ? (ko ? "승리" : "VICTORY") : ko ? "패배" : "DEFEAT"}
          </p>
          <p style={{ fontSize: 14, color: C.stone, margin: 0 }}>
            vs. {targetUser?.nickname ?? "상대방"}
          </p>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg,#1e1508,#120e06)",
            border: `2px solid ${C.border}`,
            borderRadius: 8,
            padding: "16px 28px",
            textAlign: "center",
          }}
        >
          {npcTarget && !won ? (
            <>
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#60a5fa",
                  margin: "0 0 4px",
                }}
              >
                {ko ? "패배 무손실" : ja ? "敗北ペナルティなし" : "No Penalty"}
              </p>
              <p style={{ fontSize: 11, color: C.stoneFaint, margin: 0 }}>
                {ko
                  ? "AI 수련 전투 — 점수 변동 없음"
                  : ja
                    ? "AI練習戦闘 — スコア変動なし"
                    : "AI practice — score unchanged"}
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: 32,
                  fontWeight: 900,
                  color: battleResult.pointsDelta >= 0 ? "#4ade80" : "#f87171",
                  margin: "0 0 4px",
                }}
              >
                {battleResult.pointsDelta >= 0 ? "+" : ""}
                {battleResult.pointsDelta} pts
              </p>
              <p style={{ fontSize: 12, color: C.stone, margin: 0 }}>
                {ko ? "현재" : "Total"}:{" "}
                {battleResult.tierPoints.toLocaleString()} pts
              </p>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
          <PixelBtn onClick={() => setPhase("lobby")} color="gray">
            {ko ? "로비로" : ja ? "ロビーへ" : "Lobby"}
          </PixelBtn>
          <PixelBtn
            onClick={() => {
              setBattleResult(null);
              setEditingDeckType("attack");
              setPhase("deck-edit");
            }}
          >
            {ko ? "덱 수정" : ja ? "デッキ編集" : "Edit Deck"}
          </PixelBtn>
        </div>
      </div>
    );
  }

  // 공격 확인 화면
  if (phase === "attack-confirm" && targetUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          padding: "16px 16px 40px",
        }}
      >
        <style>{CSS}</style>
        <FeedbackToast text={toast} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <button
            onClick={() => setPhase("lobby")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <ChevronLeft size={22} color={C.stone} />
          </button>
          <h2
            style={{ margin: 0, color: C.gold, fontSize: 17, fontWeight: 900 }}
          >
            {ko ? "전투 확인" : ja ? "戦闘確認" : "Battle Preview"}
          </h2>
        </div>
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* NPC 배지 */}
          {npcTarget && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "rgba(96,165,250,0.1)",
                border: "1px solid rgba(96,165,250,0.35)",
                borderRadius: 7,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                />
                <rect
                  x="5"
                  y="4"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="6.5"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="9"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
              </svg>
              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 900 }}>
                {ko ? "AI 수련 전투" : ja ? "AI練習戦闘" : "AI Practice Battle"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: "#4ade80",
                  fontWeight: 900,
                }}
              >
                {ko
                  ? `승리 시 +${npcTarget.winPts}P`
                  : ja
                    ? `勝利時 +${npcTarget.winPts}P`
                    : `Win +${npcTarget.winPts}P`}
                {ko
                  ? " / 패배 무손실"
                  : ja
                    ? " / 敗北ペナルティなし"
                    : " / No loss penalty"}
              </span>
            </div>
          )}

          {/* 내 공격 덱 */}
          <div
            style={{
              background: "linear-gradient(135deg,#061a30,#040f1c)",
              border: "1px solid #1e3a5f",
              borderRadius: 8,
              padding: "14px 12px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 11,
                color: "#60a5fa",
                fontWeight: 900,
                letterSpacing: "0.12em",
              }}
            >
              {ko ? "내 공격 덱" : ja ? "自分の攻撃デッキ" : "My Attack Deck"}
            </p>
            {!myAtkSlots.some(Boolean) ? (
              <p style={{ color: C.stoneFaint, fontSize: 12, margin: 0 }}>
                {ko ? "덱 없음 — 자동으로 첫 번째 캐릭터 사용" : "덱 없음"}
              </p>
            ) : (
              [
                {
                  label: ko ? "전열" : ja ? "前列" : "Front",
                  hint: ko
                    ? "HP+20% · DEF+10%"
                    : ja
                      ? "HP+20% · 防御+10%"
                      : "HP+20% · DEF+10%",
                  color: "#60a5fa",
                  idxs: [0, 1] as const,
                },
                {
                  label: ko ? "후열" : ja ? "後列" : "Back",
                  hint: ko
                    ? "ATK+15% · 치명+8%"
                    : ja
                      ? "ATK+15% · 会心+8%"
                      : "ATK+15% · CRIT+8%",
                  color: "#f87171",
                  idxs: [2, 3] as const,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 2,
                        height: 12,
                        borderRadius: 1,
                        background: row.color,
                      }}
                    />
                    <span
                      style={{ fontSize: 9, fontWeight: 900, color: row.color }}
                    >
                      {row.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {row.idxs.map((i) => (
                      <DeckSlotCard
                        key={i}
                        charId={myAtkSlots[i] || null}
                        small
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 8,
                      color: row.color,
                      opacity: 0.65,
                      background: `${row.color}15`,
                      borderRadius: 3,
                      padding: "2px 6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.hint}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* vs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(90deg,transparent,${C.border})`,
              }}
            />
            <Swords size={18} color={C.gold} />
            <div
              style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(90deg,${C.border},transparent)`,
              }}
            />
          </div>

          {/* 상대 방어 덱 */}
          <div
            style={{
              background: npcTarget
                ? "linear-gradient(135deg,#1a0908,#0e0504)"
                : "linear-gradient(135deg,#1f0606,#130404)",
              border: npcTarget ? "1px solid #5a1e0e88" : "1px solid #4f0e0e",
              borderRadius: 8,
              padding: "14px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  color: npcTarget ? "#f8936e" : "#f87171",
                }}
              >
                {npcTarget
                  ? ko
                    ? "AI 방어 덱"
                    : ja
                      ? "AI防御デッキ"
                      : "AI Defense Deck"
                  : `${targetUser.nickname} ${ko ? "방어 덱" : ja ? "防御デッキ" : "Defense Deck"}`}
              </p>
              {npcTarget && (
                <span style={{ display: "flex", gap: 1 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <svg key={i} width="9" height="9" viewBox="0 0 10 10">
                      <polygon
                        points="5,1 6.2,3.8 9.5,4 7,6.2 7.8,9.5 5,7.8 2.2,9.5 3,6.2 0.5,4 3.8,3.8"
                        fill={i < npcTarget.stars ? "#fbbf24" : "#2e1f06"}
                      />
                    </svg>
                  ))}
                </span>
              )}
            </div>
            <p
              style={{ margin: "0 0 10px", fontSize: 10, color: C.stoneFaint }}
            >
              {targetUser.tierPoints.toLocaleString()} pts
            </p>
            {[
              {
                label: ko ? "전열" : ja ? "前列" : "Front",
                hint: ko
                  ? "HP+20% · DEF+10%"
                  : ja
                    ? "HP+20% · 防御+10%"
                    : "HP+20% · DEF+10%",
                color: "#60a5fa",
                idxs: [0, 1] as const,
              },
              {
                label: ko ? "후열" : ja ? "後列" : "Back",
                hint: ko
                  ? "ATK+15% · 치명+8%"
                  : ja
                    ? "ATK+15% · 会心+8%"
                    : "ATK+15% · CRIT+8%",
                color: "#f87171",
                idxs: [2, 3] as const,
              },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: 12,
                      borderRadius: 1,
                      background: row.color,
                    }}
                  />
                  <span
                    style={{ fontSize: 9, fontWeight: 900, color: row.color }}
                  >
                    {row.label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {row.idxs.map((i) => {
                    const id = targetDefSlots[i];
                    if (!id)
                      return <DeckSlotCard key={i} charId={null} small />;
                    const ch = charById(id);
                    const TYPE_ARCH: Record<string, string> = {
                      wolf: "warrior",
                      tiger: "warrior",
                      lion: "warrior",
                      bear: "warrior",
                      cat: "rogue",
                      rabbit: "rogue",
                      deer: "rogue",
                      eagle: "rogue",
                      ghost: "mage",
                      owl: "mage",
                      dragon: "mage",
                      angel: "mage",
                      phoenix: "mage",
                      turtle: "tank",
                      elephant: "tank",
                      whale: "tank",
                      crocodile: "tank",
                      boar: "tank",
                      plant: "nature",
                      fish: "nature",
                      unicorn: "nature",
                      horse: "nature",
                      robot: "meka",
                      slime: "meka",
                      beetle: "meka",
                      fox: "cursed",
                      monkey: "cursed",
                      raven: "cursed",
                      snake: "cursed",
                      demon: "cursed",
                    };
                    const arch = TYPE_ARCH[ch.type] ?? "all";
                    const elem =
                      {
                        warrior: "fire",
                        tank: "earth",
                        mage: "ice",
                        rogue: "dark",
                        nature: "nature",
                        meka: "lightning",
                        cursed: "shadow",
                        all: "light",
                      }[arch] ?? "light";
                    const al = ARCHETYPE_LABEL[arch];
                    const ec = ELEMENT_COLOR[elem] ?? "#888";
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <DeckSlotCard charId={id} small />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            color: ec,
                            background: `${ec}22`,
                            border: `1px solid ${ec}55`,
                            borderRadius: 3,
                            padding: "1px 5px",
                          }}
                        >
                          <ArchetypeIcon arch={arch} size={8} />
                          <span
                            style={{
                              fontSize: 8,
                              fontWeight: 900,
                              lineHeight: 1.3,
                            }}
                          >
                            {ko ? al?.ko : ja ? al?.ja : al?.en}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 8,
                    color: row.color,
                    opacity: 0.65,
                    background: `${row.color}15`,
                    borderRadius: 3,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                    alignSelf: "center",
                  }}
                >
                  {row.hint}
                </span>
              </div>
            ))}
          </div>

          {/* 티켓 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#0a0805",
              border: `1px solid ${C.borderFaint}`,
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 13, color: C.stone }}>
              {ko ? "입장권" : ja ? "入場券" : "Tickets"}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 900,
                fontSize: 16,
                color: tickets > 0 ? C.gold : "#f87171",
              }}
            >
              {Array.from({ length: tickets }, (_, i) => (
                <Ticket
                  key={i}
                  size={14}
                  color={C.gold}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 1,
                  }}
                />
              ))}
              {tickets === 0 && (msToNext ? fmtMs(msToNext) : "")}
            </span>
          </div>
          <PixelBtn
            onClick={startBattle}
            disabled={tickets === 0 || !myAtkSlots.some(Boolean)}
          >
            <Swords size={18} />{" "}
            {ko ? "전투 시작" : ja ? "戦闘開始" : "Start Battle"}
          </PixelBtn>
        </div>
      </div>
    );
  }

  // ── 로비 ──────────────────────────────────────────────────────────────────
  const tierIdx = getTierIdx(tierPts);
  const tier = TIERS[tierIdx];
  const tierLabel = ko ? tier.ko : ja ? tier.ja : tier.en;
  const tierNext = TIERS[tierIdx + 1]?.min ?? tier.min + 1000;
  const tierProgress = Math.min(
    1,
    (tierPts - tier.min) / (tierNext - tier.min),
  );
  const RANK_PAGE_SZ = 5;
  // ── 티어 필터 적용 ──
  const filteredRankings =
    tierFilter === null
      ? rankings
      : rankings.filter((e) => getTierIdx(e.tierPoints) === tierFilter);
  const rankTotalPages = Math.ceil(filteredRankings.length / RANK_PAGE_SZ);
  const rankPage5 = filteredRankings.slice(
    rankPage * RANK_PAGE_SZ,
    (rankPage + 1) * RANK_PAGE_SZ,
  );
  const myRankEntry = rankings.find((e) => e.userId === user?.id);

  // ── 공격 가능한 유효한 타겟 (나 제외) ──
  const attackableEntries = filteredRankings.filter(
    (e) => e.userId !== user?.id,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        padding: "0 0 60px",
        fontFamily: FONT,
      }}
    >
      <style>{CSS}</style>
      <FeedbackToast text={toast} />

      {/* ══ 히어로 배너 ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          background:
            "linear-gradient(180deg,#1e1006 0%,#120a04 55%,#0c0703 100%)",
          borderBottom: `3px solid #6b3a0e`,
          boxShadow: `0 6px 40px ${C.goldGlow}55`,
        }}
      >
        {/* 석재 질감 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            pointerEvents: "none",
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 15px,#fff 15px,#fff 16px),repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,0.5) 31px,rgba(255,255,255,0.5) 32px)",
          }}
        />
        {/* 금빛 방사광 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse 80% 60% at 50% 110%,${C.goldGlow}22 0%,transparent 65%)`,
          }}
        />
        {/* 사이드 그라디언트 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg,rgba(0,0,0,0.35) 0%,transparent 30%,transparent 70%,rgba(0,0,0,0.35) 100%)",
          }}
        />

        {/* 횃불 */}
        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 2 }}>
          <Torch />
        </div>
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 2 }}>
          <Torch flip />
        </div>

        {/* 시즌 보상 버튼 (우상단) */}
        <button
          onClick={() => setShowSeason(true)}
          style={{
            position: "absolute",
            top: 14,
            right: 48,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(200,164,74,0.14)",
            border: "1px solid #6b4a12",
            borderRadius: 6,
            padding: "5px 11px",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 900,
            color: C.gold,
            backdropFilter: "blur(4px)",
          }}
        >
          <Gift size={12} color={C.gold} />
          {ko
            ? `S${SEASON.number} 보상`
            : ja
              ? `S${SEASON.number}報酬`
              : `S${SEASON.number}`}
        </button>

        {/* 상단 컨텐츠 */}
        <div
          style={{
            padding: "20px 16px 0",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 9,
              letterSpacing: "0.6em",
              color: C.stone,
              fontWeight: 900,
            }}
          >
            K E B O M O N
          </p>
          {/* 경기장 게이트 */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 10,
              marginBottom: 2,
            }}
          >
            <ArenaFlag />
            <ArenaGate />
            <ArenaFlag flip />
          </div>
          <h1
            style={{
              margin: "0 0 4px",
              fontFamily: "'Courier New',monospace",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "0.25em",
              color: C.gold,
              textShadow: `0 0 32px ${C.goldGlow}, 2px 2px 0 #3a2508, -1px -1px 0 #3a2508`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Swords size={20} color={C.gold} strokeWidth={2.5} />
            COLOSSEUM
            <Swords size={20} color={C.gold} strokeWidth={2.5} />
          </h1>
          {/* 시즌 배지 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(200,164,74,0.09)",
              border: `1px solid ${C.gold}33`,
              borderRadius: 20,
              padding: "3px 16px",
              marginBottom: 14,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 14 14">
              <polygon
                points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2"
                fill="#c8a44a"
                opacity="0.9"
              />
            </svg>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.14em",
                color: C.gold,
              }}
            >
              {ko
                ? `시즌 ${SEASON.number} · 영광의 시작`
                : ja
                  ? `S${SEASON.number} · 栄光の始まり`
                  : `Season ${SEASON.number} · Glory Begins`}
            </span>
            <svg width="11" height="11" viewBox="0 0 14 14">
              <polygon
                points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2"
                fill="#c8a44a"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>

        {/* 티어 + 스탯 통합 카드 (배너 하단에 붙음) */}
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "0 12px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              background: `linear-gradient(135deg,${tier.glow}22 0%,rgba(0,0,0,0.55) 100%)`,
              border: `1px solid ${tier.color}55`,
              borderRadius: "8px 8px 0 0",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* 티어 배지 */}
              <div
                style={{
                  flexShrink: 0,
                  animation: "col-tier-pulse 3s ease-in-out infinite",
                  color: tier.color,
                }}
              >
                <TierBadgeSvg idx={tierIdx} size={36} />
              </div>
              {/* 티어 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                >
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 15,
                      fontWeight: 900,
                      color: tier.color,
                      textShadow: `0 0 12px ${tier.glow}`,
                    }}
                  >
                    {tierLabel}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: C.stone,
                    }}
                  >
                    {tierPts.toLocaleString()} pts
                  </span>
                </div>
                {/* 진행 바 */}
                <div
                  style={{
                    height: 7,
                    background: "rgba(0,0,0,0.6)",
                    border: `1px solid ${tier.color}44`,
                    borderRadius: 4,
                    overflow: "hidden",
                    marginTop: 4,
                    boxShadow: `0 0 8px ${tier.glow}33`,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${tierProgress * 100}%`,
                      background: `linear-gradient(90deg,${tier.glow},${tier.color})`,
                      boxShadow: `0 0 16px ${tier.color}aa`,
                      borderRadius: 4,
                      transition: "width 0.6s cubic-bezier(0.25,0.8,0.25,1)",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "0 auto 0 0",
                        width: "100%",
                        background:
                          "linear-gradient(180deg,rgba(255,255,255,0.3) 0%,transparent 60%)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 9,
                    color: C.stoneFaint,
                    fontFamily: "monospace",
                  }}
                >
                  {tierPts.toLocaleString()} /{" "}
                  {(
                    TIERS[tierIdx + 1]?.min ?? tier.min + 1000
                  ).toLocaleString()}{" "}
                  pts
                </p>
              </div>
            </div>

            {/* 승/패/연승 가로 통계 */}
            <div
              style={{
                display: "flex",
                marginTop: 8,
                paddingTop: 8,
                borderTop: `1px solid ${tier.color}33`,
                gap: 0,
              }}
            >
              {[
                {
                  lk: "승",
                  lj: "勝",
                  le: "WIN",
                  val: stats.wins,
                  col: "#4ade80",
                  bg: "rgba(74,222,128,0.08)",
                },
                {
                  lk: "패",
                  lj: "敗",
                  le: "LOSE",
                  val: stats.losses,
                  col: "#f87171",
                  bg: "rgba(248,113,113,0.08)",
                },
                {
                  lk: "연승",
                  lj: "連勝",
                  le: "STREAK",
                  val: stats.winStreak,
                  col: C.gold,
                  bg: `rgba(200,164,74,0.08)`,
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "4px 0",
                    background: s.bg,
                    borderRadius: 4,
                    margin: "0 3px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "monospace",
                      fontSize: 16,
                      fontWeight: 900,
                      color: s.col,
                      lineHeight: 1,
                      textShadow: `0 0 10px ${s.col}88`,
                    }}
                  >
                    {s.val}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontFamily: FONT,
                      fontSize: 9,
                      color: C.stoneFaint,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {ko ? s.lk : ja ? s.lj : s.le}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 배너 하단 border 연결 */}
          <div
            style={{
              height: 3,
              background: `linear-gradient(90deg,transparent,${tier.color}88,${tier.color},${tier.color}88,transparent)`,
            }}
          />
        </div>
      </div>

      {showSeason && (
        <SeasonRewardModal
          onClose={() => setShowSeason(false)}
          ko={ko}
          ja={ja}
          myPts={tierPts}
        />
      )}

      {/* ══ 탭 바 ══════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 12px" }}>
        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${C.border}`,
            marginTop: 2,
          }}
        >
          {[
            {
              key: "battle" as const,
              icon: <Swords size={13} strokeWidth={2.5} />,
              labelKo: "대전",
              labelJa: "対戦",
              labelEn: "Battle",
            },
            {
              key: "deck" as const,
              icon: <Sword size={13} strokeWidth={2.5} />,
              labelKo: "덱",
              labelJa: "デッキ",
              labelEn: "Deck",
            },
            {
              key: "ai" as const,
              icon: <Bot size={13} strokeWidth={2.5} />,
              labelKo: "수련",
              labelJa: "修練",
              labelEn: "Train",
            },
          ].map((t) => {
            const active = lobbyTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setLobbyTab(t.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "10px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: active
                    ? `3px solid ${C.gold}`
                    : "3px solid transparent",
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  color: active ? C.gold : C.stoneFaint,
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                  marginBottom: -2,
                }}
              >
                {t.icon}
                {ko ? t.labelKo : ja ? t.labelJa : t.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* ══ 탭: 덱 구성 ════════════════════════════════════════════════════ */}
        {lobbyTab === "deck" && (
          <div
            style={{
              background: "linear-gradient(135deg,#18120a 0%,#0e0b06 100%)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(200,164,74,0.06)",
                borderBottom: `1px solid ${C.borderFaint}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Swords size={13} color={C.gold} strokeWidth={2.5} />
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 900,
                  color: C.gold,
                  letterSpacing: "0.1em",
                }}
              >
                {ko ? "전투 덱 구성" : ja ? "戦闘デッキ" : "Battle Deck"}
              </span>
            </div>

            {/* 공격/방어 덱 나란히 */}
            <div className="col-deck-wrap" style={{ display: "flex", gap: 0 }}>
              {[
                {
                  type: "attack" as const,
                  label: ko ? "공격 덱" : ja ? "攻撃" : "ATK",
                  slots: myAtkSlots,
                  accent: "#60a5fa",
                  bgGrad: "linear-gradient(135deg,#061a30 0%,#040f1c 100%)",
                  bdr: "#1e3a5f",
                },
                {
                  type: "defense" as const,
                  label: ko ? "방어 덱" : ja ? "防御" : "DEF",
                  slots: myDefSlots,
                  accent: "#f87171",
                  bgGrad: "linear-gradient(135deg,#200707 0%,#130404 100%)",
                  bdr: "#4f0e0e",
                },
              ].map((dk, di) => (
                <div
                  key={dk.type}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    background: dk.bgGrad,
                    borderLeft:
                      di === 1 ? `1px solid ${C.borderFaint}` : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: dk.accent,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {dk.label}
                    </span>
                    <button
                      onClick={() => void autoFillDeck(dk.type)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        background: `${dk.accent}12`,
                        border: `1px solid ${dk.accent}44`,
                        color: dk.accent,
                        fontFamily: FONT,
                        fontSize: 10,
                        fontWeight: 900,
                        padding: "3px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >
                      {colCopy.autoDeck}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDeckType(dk.type);
                        setPhase("deck-edit");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        background: `${dk.accent}18`,
                        border: `1px solid ${dk.accent}55`,
                        color: dk.accent,
                        fontFamily: FONT,
                        fontSize: 10,
                        fontWeight: 900,
                        padding: "3px 10px",
                        borderRadius: 4,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      {ko ? "편집" : ja ? "編集" : "Edit"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {Array.from({ length: 4 }, (_, i) => {
                      const id = dk.slots[i];
                      if (!id)
                        return (
                          <div
                            key={i}
                            style={{
                              width: 44,
                              height: 44,
                              border: `2px dashed ${dk.bdr}`,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Plus size={13} color={dk.bdr} />
                          </div>
                        );
                      const ch = charById(id);
                      const th = RARITY_THEME[ch.rarity as CharacterRarity];
                      return (
                        <div
                          key={i}
                          style={{
                            width: 44,
                            height: 44,
                            border: `2px solid ${th?.border ?? dk.bdr}`,
                            borderRadius: 6,
                            background: th?.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: `0 0 8px ${th?.glow ?? dk.accent}44`,
                            position: "relative",
                          }}
                        >
                          <PixelSprite
                            type={ch.type as CharacterType}
                            rarity={ch.rarity as CharacterRarity}
                            size={34}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 9,
                      color: `${dk.accent}88`,
                      fontFamily: "monospace",
                    }}
                  >
                    {dk.slots.length}/4 {ko ? "편성" : ja ? "編成" : "slots"}
                  </p>
                </div>
              ))}
            </div>

            {/* 덱 탭 안내 — 대전 탭 바로가기 */}
            <div
              style={{
                padding: "12px 14px",
                borderTop: `1px solid ${C.borderFaint}`,
                background: "rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 10, color: C.stoneFaint }}>
                {ko
                  ? "덱 편성 후 대전 탭에서 전투를 시작하세요"
                  : ja
                    ? "デッキ編成後、対戦タブで戦闘を開始してください"
                    : "Set your deck, then go to Battle tab to fight"}
              </span>
              <button
                onClick={() => setLobbyTab("battle")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: `${C.gold}18`,
                  border: `1px solid ${C.gold}44`,
                  color: C.gold,
                  fontFamily: FONT,
                  fontSize: 10,
                  fontWeight: 900,
                  padding: "4px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                <Swords size={10} strokeWidth={2.5} />
                {ko ? "대전 탭" : ja ? "対戦タブ" : "Battle Tab"}
              </button>
            </div>
          </div>
        )}

        {/* ══ 탭: 대전 — 입장권 + 전투 시작 CTA ════════════════════════════ */}
        {lobbyTab === "battle" && (
          <>
            <div
              style={{
                background: "linear-gradient(135deg,#1a1208 0%,#0e0b06 100%)",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 14px 16px",
              }}
            >
              {/* 덱 미리보기 (소형) */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  {
                    label: ko ? "공격" : ja ? "攻撃" : "ATK",
                    slots: myAtkSlots,
                    accent: "#60a5fa",
                  },
                  {
                    label: ko ? "방어" : ja ? "防御" : "DEF",
                    slots: myDefSlots,
                    accent: "#f87171",
                  },
                ].map((dk) => (
                  <div
                    key={dk.label}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.3)",
                      border: `1px solid ${C.borderFaint}`,
                      borderRadius: 7,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 900,
                          color: dk.accent,
                        }}
                      >
                        {dk.label}
                      </span>
                      <button
                        onClick={() => setLobbyTab("deck")}
                        style={{
                          fontSize: 8,
                          color: C.stoneFaint,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {ko ? "편집" : ja ? "編集" : "Edit"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: 4 }, (_, i) => {
                        const id = dk.slots[i];
                        if (!id)
                          return (
                            <div
                              key={i}
                              style={{
                                width: 30,
                                height: 30,
                                border: `1.5px dashed ${C.borderFaint}`,
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            />
                          );
                        const ch = charById(id);
                        const th = RARITY_THEME[ch.rarity as CharacterRarity];
                        return (
                          <div
                            key={i}
                            style={{
                              width: 30,
                              height: 30,
                              border: `1.5px solid ${th?.border ?? C.borderFaint}`,
                              borderRadius: 4,
                              background: th?.bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <PixelSprite
                              type={ch.type as CharacterType}
                              rarity={ch.rarity as CharacterRarity}
                              size={22}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 입장권 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flex: 1,
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: C.stone, fontWeight: 700 }}
                  >
                    {ko ? "입장권" : ja ? "入場券" : "Tickets"}
                  </span>
                  <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                    {Array.from({ length: MAX_TICKETS }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 10,
                          height: 22,
                          borderRadius: 3,
                          background:
                            i < tickets
                              ? `linear-gradient(180deg,${C.gold},#8b6020)`
                              : "#2e1f06",
                          border:
                            i < tickets
                              ? `1px solid ${C.gold}66`
                              : `1px solid #1a1005`,
                          boxShadow:
                            i < tickets ? `0 0 6px ${C.goldGlow}88` : "none",
                          transition: "all 0.3s",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: 900,
                      color: tickets > 0 ? C.gold : "#f87171",
                      marginLeft: 4,
                    }}
                  >
                    {tickets}/{MAX_TICKETS}
                  </span>
                </div>
                {msToNext && tickets < MAX_TICKETS && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${C.borderFaint}`,
                      borderRadius: 5,
                      padding: "3px 8px",
                    }}
                  >
                    <span style={{ fontSize: 10, color: C.stoneFaint }}>
                      {ko ? "충전" : ja ? "補充" : "next"}
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 900,
                        color: "#60a5fa",
                      }}
                    >
                      {fmtMs(msToNext)}
                    </span>
                  </div>
                )}
              </div>

              {/* 전투 시작 버튼 */}
              <button
                disabled={tickets === 0 || !myAtkSlots.some(Boolean)}
                onClick={() =>
                  document
                    .getElementById("col-ranking")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="col-btn-shine"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "linear-gradient(180deg,#374151,#1f2937)"
                      : "linear-gradient(180deg,#d4a84b 0%,#c8a44a 40%,#8b6020 100%)",
                  border:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "3px solid #1f2937"
                      : "3px solid #5a3d0e",
                  boxShadow:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "0 5px 0 #0f172a"
                      : undefined,
                  color:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "#6b7280"
                      : "#1c1101",
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "0.1em",
                  padding: "14px 0",
                  borderRadius: 6,
                  cursor:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "not-allowed"
                      : "pointer",
                  animation:
                    tickets > 0 && myAtkSlots.some(Boolean)
                      ? "col-battle-ready 2.4s ease-in-out infinite"
                      : undefined,
                  transition: "opacity 0.2s",
                }}
              >
                <Swords size={20} strokeWidth={2.5} />{" "}
                {tickets === 0
                  ? ko
                    ? "입장권 소진"
                    : ja
                      ? "入場券なし"
                      : "No Tickets"
                  : !myAtkSlots.some(Boolean)
                    ? ko
                      ? "공격 덱 편성 필요"
                      : ja
                        ? "デッキなし"
                        : "Set Attack Deck First"
                    : ko
                      ? "결투 상대 선택 ↓"
                      : ja
                        ? "対戦相手選択 ↓"
                        : "Select Opponent ↓"}
              </button>
              {!myAtkSlots.some(Boolean) && tickets > 0 && (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 10,
                    color: "#f87171",
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={() => setLobbyTab("deck")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      background: "none",
                      border: "none",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: 10,
                      fontFamily: FONT,
                      textDecoration: "underline",
                    }}
                  >
                    <Sword size={10} strokeWidth={2.5} />
                    {ko ? "덱 탭" : ja ? "デッキ" : "Deck tab"}
                  </button>
                  {ko
                    ? "에서 공격 덱을 편성해 주세요"
                    : ja
                      ? "で攻撃デッキを編成してください"
                      : " — set up your attack deck first"}
                </p>
              )}
            </div>

            {/* ══ 복수 목록 (대전 탭 안) ═══════════════════════════════════════ */}
            {revengeTargets.length > 0 && (
              <div
                style={{
                  background: "linear-gradient(135deg,#180a0a 0%,#0e0606 100%)",
                  border: "1px solid #6b1414",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setRevengeOpen((p) => !p)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "rgba(248,113,113,0.07)",
                    borderBottom: revengeOpen ? "1px solid #3a0e0e" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Swords size={13} color="#f87171" strokeWidth={2.5} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#f87171",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {ko ? "복수 목록" : ja ? "リベンジ" : "Revenge"}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        color: "#f87171",
                        background: "rgba(248,113,113,0.15)",
                        border: "1px solid rgba(248,113,113,0.35)",
                        borderRadius: 10,
                        padding: "1px 7px",
                      }}
                    >
                      {revengeTargets.length}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    color="#f87171"
                    style={{
                      transform: revengeOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {revengeOpen && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {revengeTargets.map((rt, i) => {
                      const eti = getTierIdx(rt.tierPoints);
                      const ago = (() => {
                        const diff = Date.now() - new Date(rt.at).getTime();
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return h > 0
                          ? ko
                            ? `${h}시간 전`
                            : ja
                              ? `${h}時間前`
                              : `${h}h ago`
                          : ko
                            ? `${m}분 전`
                            : ja
                              ? `${m}分前`
                              : `${m}m ago`;
                      })();
                      return (
                        <div
                          key={rt.userId + i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderBottom:
                              i < revengeTargets.length - 1
                                ? "1px solid #2a0e0e"
                                : "none",
                            background:
                              i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.012)",
                          }}
                        >
                          <TierBadgeSvg idx={eti} size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "#e2e8f0",
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {rt.name}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 9,
                                  fontFamily: "monospace",
                                  color: TIERS[eti].color,
                                }}
                              >
                                {rt.tierPoints.toLocaleString()} pts
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: rt.theyWon ? "#f87171" : "#4ade80",
                                  background: rt.theyWon
                                    ? "rgba(248,113,113,0.12)"
                                    : "rgba(74,222,128,0.12)",
                                  border: `1px solid ${rt.theyWon ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                }}
                              >
                                {rt.theyWon
                                  ? ko
                                    ? "나를 격파"
                                    : ja
                                      ? "撃破された"
                                      : "They won"
                                  : ko
                                    ? "패배함"
                                    : ja
                                      ? "敗北"
                                      : "They lost"}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#4b5563",
                                  marginLeft: "auto",
                                }}
                              >
                                {ago}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{ display: "flex", gap: 4, flexShrink: 0 }}
                          >
                            {rt.defenseSlots.slice(0, 3).map((id, si) => {
                              const ch = charById(id);
                              const th =
                                RARITY_THEME[ch.rarity as CharacterRarity];
                              return (
                                <div
                                  key={si}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    border: `1px solid ${th?.border ?? "#374151"}`,
                                    borderRadius: 4,
                                    background: th?.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <PixelSprite
                                    type={ch.type as CharacterType}
                                    rarity={ch.rarity as CharacterRarity}
                                    size={20}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <button
                            onClick={() =>
                              startAttackConfirm({
                                userId: rt.userId,
                                nickname: rt.name,
                                tierPoints: rt.tierPoints,
                                rank: 0,
                                wins: 0,
                                winStreak: 0,
                                characterId: null,
                              })
                            }
                            disabled={
                              tickets === 0 || !myAtkSlots.some(Boolean)
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background:
                                tickets > 0 && myAtkSlots.some(Boolean)
                                  ? "linear-gradient(180deg,#ef4444,#991b1b)"
                                  : "#1e0a0a",
                              border: `2px solid ${tickets > 0 && myAtkSlots.some(Boolean) ? "#7f1d1d" : "#2e0a0a"}`,
                              color:
                                tickets > 0 && myAtkSlots.some(Boolean)
                                  ? "#fff"
                                  : "#6b7280",
                              fontFamily: FONT,
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "5px 10px",
                              borderRadius: 4,
                              cursor:
                                tickets === 0 || !myAtkSlots.some(Boolean)
                                  ? "not-allowed"
                                  : "pointer",
                              flexShrink: 0,
                              boxShadow:
                                tickets > 0 && myAtkSlots.some(Boolean)
                                  ? "0 3px 0 #450a0a"
                                  : "none",
                            }}
                          >
                            <Swords size={10} strokeWidth={2.5} />
                            {ko ? "복수" : ja ? "復讐" : "Revenge"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ 전투 기록 (대전 탭 안) ═══════════════════════════════════════ */}
            {battleHistory.length > 0 && (
              <div
                style={{
                  background: "linear-gradient(135deg,#0a1420 0%,#060d16 100%)",
                  border: "1px solid #14395a",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setHistoryOpen((p) => !p)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "rgba(96,165,250,0.07)",
                    borderBottom: historyOpen ? "1px solid #0e2a44" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <History size={13} color="#60a5fa" strokeWidth={2.5} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#60a5fa",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {ko ? "전투 기록" : ja ? "バトル履歴" : "Battle History"}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        color: "#60a5fa",
                        background: "rgba(96,165,250,0.15)",
                        border: "1px solid rgba(96,165,250,0.35)",
                        borderRadius: 10,
                        padding: "1px 7px",
                      }}
                    >
                      {battleHistory.length}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    color="#60a5fa"
                    style={{
                      transform: historyOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {historyOpen && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {battleHistory.map((bh, i) => {
                      const ago = (() => {
                        const diff =
                          Date.now() - new Date(bh.createdAt).getTime();
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return h > 0
                          ? ko
                            ? `${h}시간 전`
                            : ja
                              ? `${h}時間前`
                              : `${h}h ago`
                          : ko
                            ? `${m}분 전`
                            : ja
                              ? `${m}分前`
                              : `${m}m ago`;
                      })();
                      const highlighted = historyHighlightId === bh.id;
                      return (
                        <div
                          key={bh.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderBottom:
                              i < battleHistory.length - 1
                                ? "1px solid #0e2233"
                                : "none",
                            background: highlighted
                              ? "rgba(96,165,250,0.14)"
                              : i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.012)",
                            boxShadow: highlighted
                              ? "inset 3px 0 0 #60a5fa"
                              : "none",
                            transition: "background 0.4s, box-shadow 0.4s",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "#e2e8f0",
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {bh.isAttacker
                                ? ko
                                  ? `vs ${bh.opponentName}`
                                  : ja
                                    ? `vs ${bh.opponentName}`
                                    : `vs ${bh.opponentName}`
                                : ko
                                  ? `${bh.opponentName}의 공격`
                                  : ja
                                    ? `${bh.opponentName}の攻撃`
                                    : `Attacked by ${bh.opponentName}`}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 9,
                                  color: bh.won ? "#4ade80" : "#f87171",
                                  background: bh.won
                                    ? "rgba(74,222,128,0.12)"
                                    : "rgba(248,113,113,0.12)",
                                  border: `1px solid ${bh.won ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                }}
                              >
                                {bh.won
                                  ? ko
                                    ? "승리"
                                    : ja
                                      ? "勝利"
                                      : "Won"
                                  : ko
                                    ? "패배"
                                    : ja
                                      ? "敗北"
                                      : "Lost"}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  fontFamily: "monospace",
                                  color:
                                    bh.pointsDelta >= 0 ? "#4ade80" : "#f87171",
                                }}
                              >
                                {bh.pointsDelta >= 0
                                  ? `+${bh.pointsDelta}`
                                  : bh.pointsDelta}
                                pts
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#4b5563",
                                  marginLeft: "auto",
                                }}
                              >
                                {ago}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => openReplay(bh.id)}
                            disabled={replayLoadingId === bh.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background:
                                "linear-gradient(180deg,#3b82f6,#1d4ed8)",
                              border: "2px solid #1e3a8a",
                              color: "#fff",
                              fontFamily: FONT,
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "5px 10px",
                              borderRadius: 4,
                              cursor:
                                replayLoadingId === bh.id ? "wait" : "pointer",
                              flexShrink: 0,
                              boxShadow: "0 3px 0 #1e3a8a",
                              opacity: replayLoadingId === bh.id ? 0.6 : 1,
                            }}
                          >
                            {replayLoadingId === bh.id ? (
                              <>
                                <Loader2
                                  size={10}
                                  strokeWidth={2.5}
                                  style={{
                                    animation: "col-spin 0.8s linear infinite",
                                  }}
                                />
                                {ko
                                  ? "로딩..."
                                  : ja
                                    ? "読込中..."
                                    : "Loading..."}
                              </>
                            ) : (
                              <>
                                <PlayCircle size={10} strokeWidth={2.5} />
                                {ko ? "리플레이" : ja ? "リプレイ" : "Replay"}
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ 랭킹 (항상 표시) ═════════════════════════════════════════════ */}
            <div
              id="col-ranking"
              style={{
                background: "linear-gradient(135deg,#16110a 0%,#0e0b06 100%)",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* 랭킹 헤더 */}
              <div
                style={{
                  padding: "11px 14px",
                  background: "rgba(200,164,74,0.06)",
                  borderBottom: `1px solid ${C.borderFaint}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <Crown size={13} color={C.gold} />
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 12,
                        fontWeight: 900,
                        color: C.gold,
                        letterSpacing: "0.1em",
                      }}
                    >
                      {ko
                        ? "결투 상대 목록"
                        : ja
                          ? "対戦相手リスト"
                          : "Opponents"}
                    </span>
                    {rankLoading && (
                      <span style={{ fontSize: 9, color: C.stoneFaint }}>
                        로딩...
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => navigate("/colosseum/hall-of-fame")}
                      style={{
                        background: "none",
                        border: `1px solid ${C.borderFaint}`,
                        borderRadius: 8,
                        cursor: "pointer",
                        padding: "2px 8px",
                        fontFamily: FONT,
                        fontSize: 9,
                        fontWeight: 900,
                        color: C.gold,
                      }}
                    >
                      {ko ? "명예의 전당" : ja ? "殿堂入り" : "Hall of Fame"}
                    </button>
                    <button
                      onClick={() => {
                        fetchRankings();
                        setRankPage(0);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                        lineHeight: 0,
                      }}
                    >
                      <ChevronRight size={14} color={C.stoneFaint} />
                    </button>
                  </div>
                </div>
                {/* 티어 필터 칩 */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      setTierFilter(null);
                      setRankPage(0);
                    }}
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      fontFamily: FONT,
                      padding: "2px 9px",
                      borderRadius: 10,
                      border: `1px solid ${tierFilter === null ? C.gold : C.borderFaint}`,
                      background:
                        tierFilter === null ? `${C.gold}22` : "transparent",
                      color: tierFilter === null ? C.gold : C.stoneFaint,
                      cursor: "pointer",
                    }}
                  >
                    {ko ? "전체" : ja ? "全体" : "All"}
                  </button>
                  {TIERS.map((t, ti) => (
                    <button
                      key={ti}
                      onClick={() => {
                        setTierFilter(ti);
                        setRankPage(0);
                      }}
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        fontFamily: FONT,
                        padding: "2px 9px",
                        borderRadius: 10,
                        border: `1px solid ${tierFilter === ti ? t.color : C.borderFaint}`,
                        background:
                          tierFilter === ti ? `${t.color}22` : "transparent",
                        color: tierFilter === ti ? t.color : C.stoneFaint,
                        cursor: "pointer",
                      }}
                    >
                      {ko ? t.ko : ja ? t.ja : t.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* 내 랭킹 고정 */}
              {myRankEntry && (
                <div
                  style={{
                    padding: "9px 14px",
                    background: `linear-gradient(90deg,${C.gold}10,transparent)`,
                    borderBottom: `1px solid ${C.borderFaint}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ width: 28, textAlign: "center" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        fontWeight: 900,
                        color: C.gold,
                      }}
                    >
                      #{myRankEntry.rank}
                    </span>
                  </div>
                  <TierBadgeSvg
                    idx={getTierIdx(myRankEntry.tierPoints)}
                    size={22}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: C.parchment,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {myRankEntry.nickname}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: C.gold,
                      background: `${C.gold}18`,
                      border: `1px solid ${C.gold}44`,
                      borderRadius: 3,
                      padding: "2px 6px",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {ko ? "나" : "ME"}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.gold,
                      flexShrink: 0,
                    }}
                  >
                    {myRankEntry.tierPoints.toLocaleString()}
                  </span>
                </div>
              )}

              {/* 랭킹 리스트 */}
              <div>
                {rankPage5.map((entry, ri) => {
                  const isMe = entry.userId === user?.id;
                  const eti = getTierIdx(entry.tierPoints);
                  const rankColor =
                    entry.rank === 1
                      ? "#ffd700"
                      : entry.rank === 2
                        ? "#c0c0c0"
                        : entry.rank === 3
                          ? "#cd7f32"
                          : C.stoneFaint;
                  const pointGap = entry.tierPoints - tierPts;
                  const riskLevel = pointGap > 500 ? "high" : pointGap > 100 ? "mid" : "low";
                  const riskText =
                    riskLevel === "high"
                      ? colCopy.riskHigh
                      : riskLevel === "mid"
                        ? colCopy.riskMid
                        : colCopy.riskLow;
                  const riskColor =
                    riskLevel === "high"
                      ? "#f87171"
                      : riskLevel === "mid"
                        ? "#fbbf24"
                        : "#34d399";
                  return (
                    <div
                      key={entry.userId}
                      onClick={() => navigate(`/profile/${entry.userId}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderBottom: `1px solid ${C.borderFaint}`,
                        background: isMe
                          ? `${C.gold}08`
                          : ri % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.015)",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                    >
                      {/* 순위 */}
                      <div
                        style={{
                          width: 28,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {entry.rank <= 3 ? (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 14,
                              fontWeight: 900,
                              color: rankColor,
                              textShadow: `0 0 8px ${rankColor}`,
                            }}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: C.stoneFaint,
                            }}
                          >
                            {entry.rank}
                          </span>
                        )}
                      </div>
                      {/* 티어 배지 */}
                      <TierBadgeSvg idx={eti} size={22} />
                      {/* 이름 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: isMe ? C.gold : C.parchment,
                            fontWeight: isMe ? 900 : 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.nickname}
                          {isMe && (
                            <span
                              style={{
                                fontSize: 9,
                                color: C.gold,
                                marginLeft: 4,
                              }}
                            >
                              (나)
                            </span>
                          )}
                        </p>
                        <p
                          style={{
                            margin: "1px 0 0",
                            fontFamily: "monospace",
                            fontSize: 10,
                            color: TIERS[eti].color,
                          }}
                        >
                          {TIERS[eti][ko ? "ko" : ja ? "ja" : "en"]}
                        </p>
                      </div>
                      {/* 포인트 */}
                      <span
                        style={{
                          fontSize: 9,
                          color: riskColor,
                          border: `1px solid ${riskColor}66`,
                          background: `${riskColor}18`,
                          borderRadius: 4,
                          padding: "2px 6px",
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {colCopy.risk} {riskText}
                      </span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: C.stone,
                          flexShrink: 0,
                        }}
                      >
                        {entry.tierPoints.toLocaleString()}
                      </span>
                      {/* 공격 버튼 */}
                      {!isMe && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startAttackConfirm(entry); }}
                          disabled={tickets === 0 || !myAtkSlots.some(Boolean)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background:
                              tickets > 0 && myAtkSlots.some(Boolean)
                                ? "linear-gradient(180deg,#c8a44a,#8b6020)"
                                : "#1e1508",
                            border: `2px solid ${tickets > 0 && myAtkSlots.some(Boolean) ? "#5a3d0e" : "#2e1f06"}`,
                            color:
                              tickets > 0 && myAtkSlots.some(Boolean)
                                ? "#1c1101"
                                : C.stoneFaint,
                            fontFamily: FONT,
                            fontSize: 10,
                            fontWeight: 900,
                            padding: "5px 12px",
                            borderRadius: 4,
                            cursor:
                              tickets === 0 || !myAtkSlots.some(Boolean)
                                ? "not-allowed"
                                : "pointer",
                            flexShrink: 0,
                            transition: "all 0.15s",
                            boxShadow:
                              tickets > 0 && myAtkSlots.some(Boolean)
                                ? "0 3px 0 #3a2508"
                                : "none",
                          }}
                        >
                          <Swords size={10} strokeWidth={2.5} />
                          {ko ? "도전" : ja ? "挑戦" : "Fight"}
                        </button>
                      )}
                    </div>
                  );
                })}
                {attackableEntries.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      fontSize: 12,
                      color: C.stoneFaint,
                    }}
                  >
                    {ko
                      ? "아직 결투 상대가 없습니다"
                      : ja
                        ? "対戦相手がいません"
                        : "No opponents yet"}
                  </p>
                )}
              </div>

              {/* 페이지네이션 */}
              {rankTotalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: "10px",
                    borderTop: `1px solid ${C.borderFaint}`,
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <button
                    onClick={() => setRankPage((p) => Math.max(0, p - 1))}
                    disabled={rankPage === 0}
                    style={{
                      background:
                        rankPage === 0
                          ? "transparent"
                          : "rgba(200,164,74,0.12)",
                      border: `1px solid ${rankPage === 0 ? C.borderFaint : C.border}`,
                      borderRadius: 5,
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: rankPage === 0 ? "not-allowed" : "pointer",
                      color: rankPage === 0 ? C.borderFaint : C.gold,
                      transition: "all 0.15s",
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from(
                      { length: Math.min(rankTotalPages, 5) },
                      (_, i) => {
                        const pg =
                          rankTotalPages <= 5
                            ? i
                            : Math.max(
                                0,
                                Math.min(rankPage - 2, rankTotalPages - 5),
                              ) + i;
                        return (
                          <button
                            key={pg}
                            onClick={() => setRankPage(pg)}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              border: "none",
                              background:
                                pg === rankPage ? C.gold : "transparent",
                              color: pg === rankPage ? "#1c1101" : C.stoneFaint,
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {pg + 1}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setRankPage((p) => Math.min(rankTotalPages - 1, p + 1))
                    }
                    disabled={rankPage >= rankTotalPages - 1}
                    style={{
                      background:
                        rankPage >= rankTotalPages - 1
                          ? "transparent"
                          : "rgba(200,164,74,0.12)",
                      border: `1px solid ${rankPage >= rankTotalPages - 1 ? C.borderFaint : C.border}`,
                      borderRadius: 5,
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        rankPage >= rankTotalPages - 1
                          ? "not-allowed"
                          : "pointer",
                      color:
                        rankPage >= rankTotalPages - 1 ? C.borderFaint : C.gold,
                      transition: "all 0.15s",
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ 탭: AI 수련 ════════════════════════════════════════════════════ */}
        {lobbyTab === "ai" && (
          <div
            style={{
              background: "linear-gradient(135deg,#12100a 0%,#0c0a06 100%)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 14px",
                background: "rgba(96,165,250,0.06)",
                borderBottom: `1px solid ${C.borderFaint}`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                />
                <rect
                  x="5"
                  y="4"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="6.5"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="9"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
              </svg>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#60a5fa",
                  letterSpacing: "0.1em",
                }}
              >
                {ko ? "AI 수련 상대" : ja ? "AI練習相手" : "AI Practice"}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#60a5fa88",
                  background: "rgba(96,165,250,0.1)",
                  border: "1px solid rgba(96,165,250,0.3)",
                  borderRadius: 10,
                  padding: "1px 7px",
                }}
              >
                {ko
                  ? "패배 페널티 없음"
                  : ja
                    ? "敗北ペナルティなし"
                    : "No loss penalty"}
              </span>
            </div>

            <div style={{ padding: "10px 10px 12px" }}>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 10,
                  color: C.stoneFaint,
                  lineHeight: 1.5,
                  paddingLeft: 4,
                }}
              >
                {ko
                  ? "유저가 적을 때도 언제든 연습하세요. 승리 시 포인트를 획득합니다."
                  : ja
                    ? "いつでも練習できます。勝利でポイント獲得！"
                    : "Practice anytime. Win points for victories!"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {NPC_OPPONENTS.map((npc) => {
                  const t = TIERS[npc.tierIdx];
                  const onCd = isOnCooldown(npc.id);
                  const remMs = getRemainingMs(npc.id);
                  const can = tickets > 0 && myAtkSlots.some(Boolean) && !onCd;
                  const fmtCd = (ms: number) => {
                    const h = Math.floor(ms / 3600000),
                      m = Math.floor((ms % 3600000) / 60000),
                      s = Math.floor((ms % 60000) / 1000);
                    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                  };
                  return (
                    <div
                      key={npc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 10px",
                        background: `linear-gradient(90deg,${t.glow}10,transparent)`,
                        border: `1px solid ${onCd ? "#4b5563" : t.color + "33"}`,
                        borderRadius: 7,
                        transition: "border-color 0.15s",
                        opacity: onCd ? 0.65 : 1,
                      }}
                    >
                      {/* 티어 배지 */}
                      <div style={{ flexShrink: 0 }}>
                        <TierBadgeSvg idx={npc.tierIdx} size={28} />
                      </div>
                      {/* 덱 미리보기 */}
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {npc.slots.map((id, si) => {
                          const ch = charById(id);
                          const th = RARITY_THEME[ch.rarity as CharacterRarity];
                          return (
                            <div
                              key={si}
                              style={{
                                width: 30,
                                height: 30,
                                border: `1.5px solid ${th?.border ?? C.borderFaint}`,
                                borderRadius: 4,
                                background: th?.bg ?? "#0a0805",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: `0 0 5px ${th?.glow ?? "#000"}33`,
                              }}
                            >
                              <PixelSprite
                                type={ch.type as CharacterType}
                                rarity={ch.rarity as CharacterRarity}
                                size={22}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* 이름 + 설명 + 난이도 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 900,
                              color: onCd ? C.stoneFaint : t.color,
                            }}
                          >
                            {ko ? npc.nameKo : ja ? npc.nameJa : npc.nameEn}
                          </span>
                          <span style={{ display: "flex", gap: 1 }}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <svg
                                key={i}
                                width="9"
                                height="9"
                                viewBox="0 0 10 10"
                              >
                                <polygon
                                  points="5,1 6.2,3.8 9.5,4 7,6.2 7.8,9.5 5,7.8 2.2,9.5 3,6.2 0.5,4 3.8,3.8"
                                  fill={i < npc.stars ? "#fbbf24" : "#2e1f06"}
                                />
                              </svg>
                            ))}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 9,
                            color: C.stoneFaint,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ko ? npc.descKo : ja ? npc.descJa : npc.descEn}
                        </p>
                      </div>
                      {/* 보상 + 도전 버튼 */}
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <p
                          style={{
                            margin: "0 0 4px",
                            fontSize: 10,
                            fontWeight: 900,
                            color: "#4ade80",
                            fontFamily: "monospace",
                          }}
                        >
                          +{npc.winPts}P
                        </p>
                        {onCd && remMs ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#0a0805",
                              border: `1px solid ${C.borderFaint}`,
                              borderRadius: 4,
                              padding: "4px 8px",
                            }}
                          >
                            <span style={{ fontSize: 9, color: C.stoneFaint }}>
                              {ko ? "재도전" : ja ? "再挑戦" : "CD"}
                            </span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 10,
                                fontWeight: 900,
                                color: "#f87171",
                              }}
                            >
                              {fmtCd(remMs)}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => startNpcAttackConfirm(npc)}
                            disabled={!can}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              background: can
                                ? `linear-gradient(180deg,${t.color},${t.glow})`
                                : "#1e1508",
                              border: `1px solid ${can ? t.color : C.borderFaint}`,
                              color: can ? "#0c0903" : C.stoneFaint,
                              fontFamily: FONT,
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "4px 11px",
                              borderRadius: 4,
                              cursor: can ? "pointer" : "not-allowed",
                              boxShadow: can ? `0 3px 0 ${t.glow}88` : "none",
                              transition: "all 0.15s",
                            }}
                          >
                            <Swords size={9} strokeWidth={2.5} />
                            {ko ? "도전" : ja ? "挑戦" : "Fight"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
