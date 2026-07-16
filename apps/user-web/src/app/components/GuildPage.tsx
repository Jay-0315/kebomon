import { useState, useEffect, useCallback, useRef, type ElementType } from "react";
import {
  Users, Crown, ShieldHalf, Swords, Plus, Search, X, Check,
  UserMinus, LogOut, Loader2, Sparkles, ArrowUpCircle, Heart,
  Shield, Flame, Star, Trophy, Skull, Leaf, Zap, Moon, Sun, Gem, Ghost,
  MessageSquare, Send, Settings2,
} from "lucide-react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import PixelCharacter from "./PixelCharacter";
import BattleReplay from "./BattleReplay";
import { CHARACTERS } from "../data/characters";
import type {
  GuildSummary,
  GuildDetail,
  GuildApplicationInfo,
  GuildBossState,
  GuildAttackResult,
  GuildRole,
  CommunityPost,
} from "../types/domain";

type Tab = "members" | "boss" | "board" | "applications" | "settings";

// 서버 guild.constants.ts의 GUILD_ICON_IDS와 반드시 동일하게 유지
const GUILD_ICON_MAP: Record<string, { icon: ElementType; color: string }> = {
  default: { icon: Crown, color: "text-primary" },
  crown: { icon: Crown, color: "text-amber-500" },
  shield: { icon: Shield, color: "text-sky-500" },
  swords: { icon: Swords, color: "text-red-500" },
  flame: { icon: Flame, color: "text-orange-500" },
  star: { icon: Star, color: "text-yellow-400" },
  trophy: { icon: Trophy, color: "text-amber-400" },
  skull: { icon: Skull, color: "text-slate-400" },
  leaf: { icon: Leaf, color: "text-emerald-500" },
  zap: { icon: Zap, color: "text-yellow-500" },
  moon: { icon: Moon, color: "text-indigo-400" },
  sun: { icon: Sun, color: "text-amber-300" },
  gem: { icon: Gem, color: "text-pink-500" },
  ghost: { icon: Ghost, color: "text-violet-400" },
};
function getGuildIcon(iconId: string) {
  return GUILD_ICON_MAP[iconId] ?? GUILD_ICON_MAP.default;
}

function GuildIcon({ iconId, className }: { iconId: string; className?: string }) {
  const { icon: Icon, color } = getGuildIcon(iconId);
  return <Icon className={`${className ?? ""} ${color}`} />;
}

function RoleBadge({ role, ko, ja }: { role: GuildRole; ko: boolean; ja: boolean }) {
  const label = role === "owner" ? (ko ? "길드장" : ja ? "ギルド長" : "Owner")
    : role === "officer" ? (ko ? "부길드장" : ja ? "副ギルド長" : "Officer")
    : (ko ? "길드원" : ja ? "メンバー" : "Member");
  const color = role === "owner" ? "text-amber-500 bg-amber-500/10 border-amber-500/40"
    : role === "officer" ? "text-sky-500 bg-sky-500/10 border-sky-500/40"
    : "text-muted-foreground bg-muted border-border";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium shrink-0 ${color}`}>
      {label}
    </span>
  );
}

function ConfirmModal({ title, onConfirm, onCancel, busy, ko, ja }: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
  ko: boolean;
  ja: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onCancel()}>
      <div
        className="w-full max-w-xs rounded-xl border border-border bg-card p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {ko ? "취소" : ja ? "キャンセル" : "Cancel"}
          </button>
          <button
            disabled={busy}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-destructive py-2 text-sm text-destructive-foreground hover:bg-destructive/80 transition-colors disabled:opacity-50"
          >
            {ko ? "확인" : ja ? "確認" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RaidDeckModal({ ownedIds, selected, onToggle, onSave, onClose, saving, ko, ja }: {
  ownedIds: number[];
  selected: number[];
  onToggle: (id: number) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  ko: boolean;
  ja: boolean;
}) {
  const owned = CHARACTERS.filter((c) => ownedIds.includes(c.id));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-3 rounded-xl border border-border bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">
            {ko ? "레이드 전용덱 편집" : ja ? "レイド専用デッキ編集" : "Raid Deck"}
          </p>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          {ko
            ? `최대 4마리 선택 (${selected.length}/4) · 콜로세움 공격덱과 별개예요`
            : ja
            ? `最大4匹選択（${selected.length}/4）・コロシアムの攻撃デッキとは別です`
            : `Select up to 4 (${selected.length}/4) · separate from your Colosseum attack deck`}
        </p>
        <div className="grid max-h-80 grid-cols-5 gap-2 overflow-y-auto">
          {owned.map((c) => {
            const isSelected = selected.includes(c.id);
            const slotIdx = selected.indexOf(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                disabled={!isSelected && selected.length >= 4}
                className={`relative flex flex-col items-center rounded-lg border p-1 transition-colors ${
                  isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-muted disabled:opacity-30"
                }`}
              >
                {isSelected && (
                  <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {slotIdx + 1}
                  </span>
                )}
                <PixelCharacter characterId={c.id} size={40} />
              </button>
            );
          })}
        </div>
        <button
          disabled={saving}
          onClick={onSave}
          className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {ko ? "저장" : ja ? "保存" : "Save"}
        </button>
      </div>
    </div>
  );
}

export default function GuildPage() {
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const user = getStoredUser();
  const userId = user?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myGuild, setMyGuild] = useState<GuildDetail | null | undefined>(undefined);
  const [guildList, setGuildList] = useState<GuildSummary[]>([]);
  const [myApplications, setMyApplications] = useState<GuildApplicationInfo[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("members");
  const [bossState, setBossState] = useState<GuildBossState | null>(null);
  const [pendingApps, setPendingApps] = useState<GuildApplicationInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createNotice, setCreateNotice] = useState("");
  const [createIconId, setCreateIconId] = useState("default");
  const [applyTarget, setApplyTarget] = useState<GuildSummary | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [lastAttack, setLastAttack] = useState<GuildAttackResult | null>(null);
  const [replayResult, setReplayResult] = useState<GuildAttackResult | null>(null);
  const [noticeDraft, setNoticeDraft] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ label: string; run: () => void } | null>(null);
  const [boardPosts, setBoardPosts] = useState<CommunityPost[]>([]);
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [boardContent, setBoardContent] = useState("");
  const [postingBoard, setPostingBoard] = useState(false);
  const [raidDeck, setRaidDeck] = useState<number[]>([]);
  const [showDeckEditor, setShowDeckEditor] = useState(false);
  const [deckDraft, setDeckDraft] = useState<number[]>([]);
  const [savingDeck, setSavingDeck] = useState(false);
  const { rewardSummary } = useAppData();

  const loadBrowse = useCallback(async (q?: string) => {
    const [list, apps] = await Promise.all([
      api.get<GuildSummary[]>(`/guild/list${q ? `?search=${encodeURIComponent(q)}` : ""}`),
      api.get<GuildApplicationInfo[]>(`/guild/applications/mine?userId=${userId}`),
    ]);
    setGuildList(list);
    setMyApplications(apps);
  }, [userId]);

  const loadBossState = useCallback(async () => {
    const s = await api.get<GuildBossState>(`/guild/boss/state?userId=${userId}`);
    setBossState(s);
  }, [userId]);

  const loadPendingApps = useCallback(async (guildId: string) => {
    const apps = await api.get<GuildApplicationInfo[]>(
      `/guild/applications?userId=${userId}&guildId=${guildId}`,
    );
    setPendingApps(apps);
  }, [userId]);

  const loadBoard = useCallback(async () => {
    const data = await api.get<{ posts: CommunityPost[] }>(`/guild/board?userId=${userId}`);
    setBoardPosts(data.posts);
  }, [userId]);

  const loadRaidDeck = useCallback(async () => {
    const data = await api.get<{ slots: number[] }>(`/guild/raid-deck?userId=${userId}`);
    setRaidDeck(data.slots);
  }, [userId]);

  const init = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const g = await api.get<GuildDetail | null>(`/guild/mine?userId=${userId}`);
      setMyGuild(g);
      if (g) {
        await loadBossState();
        await loadRaidDeck();
        if (g.myRole === "owner" || g.myRole === "officer") {
          await loadPendingApps(g.id);
        }
      } else {
        await loadBrowse();
      }
    } catch {
      setError(ko ? "정보를 불러오지 못했습니다." : ja ? "情報を読み込めませんでした。" : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [userId, loadBossState, loadRaidDeck, loadPendingApps, loadBrowse, ko, ja]);

  useEffect(() => { void init(); }, [init]);

  useEffect(() => {
    if (myGuild) setNoticeDraft(myGuild.notice ?? "");
  }, [myGuild?.id]);

  useEffect(() => {
    if (tab === "board" && !boardLoaded) {
      setBoardLoaded(true);
      void loadBoard();
    }
  }, [tab, boardLoaded, loadBoard]);

  // busy state(React state)는 비동기로 반영되므로 빠른 연속 클릭엔 늦게 반응할 수 있음 —
  // 실제 중복 요청 방지는 이 동기 ref로 막는다.
  const actionLock = useRef(false);
  const runAction = async (fn: () => Promise<unknown>, after?: () => void | Promise<void>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (after) await after();
      else await init();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const handleCreate = () => {
    if (!createName.trim()) return;
    void runAction(() =>
      api.post("/guild/create", {
        userId,
        name: createName.trim(),
        notice: createNotice.trim() || undefined,
        iconId: createIconId,
      }),
      async () => { setShowCreate(false); setCreateName(""); setCreateNotice(""); setCreateIconId("default"); await init(); },
    );
  };

  const handleApply = () => {
    if (!applyTarget) return;
    void runAction(() =>
      api.post("/guild/apply", { userId, guildId: applyTarget.id, message: applyMessage.trim() || undefined }),
      async () => { setApplyTarget(null); setApplyMessage(""); await loadBrowse(search); },
    );
  };

  const handleCancelApplication = (id: string) => {
    void runAction(() => api.delete(`/guild/applications/${id}?userId=${userId}`), () => loadBrowse(search));
  };

  const handleApprove = (id: string) => {
    void runAction(() => api.post(`/guild/applications/${id}/approve`, { userId }));
  };
  const handleReject = (id: string) => {
    void runAction(() => api.post(`/guild/applications/${id}/reject`, { userId }));
  };

  const handleAttack = async () => {
    setAttacking(true);
    setError(null);
    try {
      const res = await api.post<GuildAttackResult>("/guild/boss/attack", { userId });
      setLastAttack(res);
      setReplayResult(res);
      await loadBossState();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAttacking(false);
    }
  };

  const openDeckEditor = () => {
    setDeckDraft(raidDeck);
    setShowDeckEditor(true);
  };
  const toggleDeckChar = (id: number) => {
    setDeckDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  };
  const handleSaveDeck = async () => {
    setSavingDeck(true);
    setError(null);
    try {
      await api.put("/guild/raid-deck", { userId, slots: deckDraft });
      setRaidDeck(deckDraft);
      setShowDeckEditor(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDeck(false);
    }
  };

  const handleKick = (targetUserId: string) => {
    void runAction(() => api.post("/guild/kick", { userId, targetUserId }));
  };
  const handleSetRole = (targetUserId: string, role: "officer" | "member") => {
    void runAction(() => api.patch("/guild/member-role", { userId, targetUserId, role }));
  };
  const handleTransfer = (targetUserId: string) => {
    void runAction(() => api.post("/guild/transfer-ownership", { userId, targetUserId }));
  };
  const handleLeave = () => {
    void runAction(() => api.post("/guild/leave", { userId }));
  };
  const handleDisband = () => {
    void runAction(() => api.post("/guild/disband", { userId }));
  };
  const handleSaveNotice = () => {
    void runAction(() => api.patch("/guild/notice", { userId, notice: noticeDraft }));
  };
  const handleUpdateIcon = (iconId: string) => {
    void runAction(() => api.patch("/guild/icon", { userId, iconId }));
  };

  const handlePostToBoard = async () => {
    if (!boardContent.trim()) return;
    setPostingBoard(true);
    setError(null);
    try {
      await api.post("/guild/board", { userId, content: boardContent.trim() });
      setBoardContent("");
      await loadBoard();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPostingBoard(false);
    }
  };

  const handleToggleBoardLike = (postId: string) => {
    setBoardPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );
    void api.post(`/community/posts/${postId}/like`, { userId });
  };

  if (!userId) return null;

  if (loading && myGuild === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── 소속 길드 없음: 찾기/생성 화면 ────────────────────────────────────────
  if (!myGuild) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Users className="w-5 h-5 text-primary" />
            {ko ? "길드" : ja ? "ギルド" : "Guild"}
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {ko ? "길드 만들기" : ja ? "ギルド作成" : "Create Guild"}
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {myApplications.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {ko ? "내 신청 현황" : ja ? "申請状況" : "My Applications"}
            </p>
            {myApplications.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.guild?.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ko ? "승인 대기 중" : ja ? "承認待ち" : "Pending approval"}
                  </p>
                </div>
                <button
                  disabled={busy}
                  onClick={() => handleCancelApplication(a.id)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {ko ? "취소" : ja ? "取消" : "Cancel"}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void loadBrowse(search); }}
              placeholder={ko ? "길드명 검색" : ja ? "ギルド名検索" : "Search guild name"}
              className="w-full rounded-lg border border-border bg-input-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => void loadBrowse(search)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            {ko ? "검색" : ja ? "検索" : "Search"}
          </button>
        </div>

        <div className="space-y-2">
          {guildList.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {ko ? "표시할 길드가 없습니다." : ja ? "表示できるギルドがありません。" : "No guilds to show."}
            </p>
          )}
          {guildList.map((g) => {
            const applied = myApplications.some((a) => a.guildId === g.id);
            const full = g.memberCount >= g.maxMembers;
            return (
              <div key={g.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <GuildIcon iconId={g.iconId} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{g.name}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">Lv.{g.level}</span>
                  </div>
                  {g.notice && <p className="truncate text-xs text-muted-foreground">{g.notice}</p>}
                  <p className="text-[11px] text-muted-foreground">{g.memberCount}/{g.maxMembers}</p>
                </div>
                <button
                  disabled={applied || full || busy}
                  onClick={() => setApplyTarget(g)}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-40"
                >
                  {applied
                    ? (ko ? "신청됨" : ja ? "申請済" : "Applied")
                    : full
                    ? (ko ? "정원 초과" : ja ? "満員" : "Full")
                    : (ko ? "가입 신청" : ja ? "参加申請" : "Apply")}
                </button>
              </div>
            );
          })}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
            <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{ko ? "길드 만들기" : ja ? "ギルド作成" : "Create Guild"}</p>
                <button onClick={() => setShowCreate(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={20}
                placeholder={ko ? "길드명 (최대 20자)" : ja ? "ギルド名（最大20文字）" : "Guild name (max 20)"}
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{ko ? "아이콘" : ja ? "アイコン" : "Icon"}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(GUILD_ICON_MAP).map((iconId) => (
                    <button
                      key={iconId}
                      type="button"
                      onClick={() => setCreateIconId(iconId)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 transition-all ${
                        createIconId === iconId ? "ring-2 ring-primary" : "hover:bg-primary/20"
                      }`}
                    >
                      <GuildIcon iconId={iconId} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={createNotice}
                onChange={(e) => setCreateNotice(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder={ko ? "공지 (선택)" : ja ? "お知らせ（任意）" : "Notice (optional)"}
                className="w-full resize-none rounded-lg border border-border bg-input-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                disabled={!createName.trim() || busy}
                onClick={handleCreate}
                className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {ko ? "만들기" : ja ? "作成" : "Create"}
              </button>
            </div>
          </div>
        )}

        {applyTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setApplyTarget(null)}>
            <div className="w-full max-w-sm space-y-3 rounded-xl border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{applyTarget.name}</p>
                <button onClick={() => setApplyTarget(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                maxLength={100}
                rows={3}
                placeholder={ko ? "가입 메시지 (선택)" : ja ? "参加メッセージ（任意）" : "Application message (optional)"}
                className="w-full resize-none rounded-lg border border-border bg-input-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                disabled={busy}
                onClick={handleApply}
                className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {ko ? "신청하기" : ja ? "申請する" : "Apply"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── 소속 길드 있음 ─────────────────────────────────────────────────────────
  const g = myGuild;
  const canManage = g.myRole === "owner" || g.myRole === "officer";
  const isOwner = g.myRole === "owner";
  const expPct = g.expToNext > 0 ? Math.min(100, Math.round((g.exp / g.expToNext) * 100)) : 100;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 길드 헤더 */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <GuildIcon iconId={g.iconId} className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-bold text-foreground">{g.name}</p>
              <RoleBadge role={g.myRole} ko={ko} ja={ja} />
            </div>
            <p className="text-xs text-muted-foreground">
              Lv.{g.level} · {g.members.length}/{g.maxMembers}
            </p>
          </div>
        </div>
        {g.notice && <p className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">{g.notice}</p>}
        {g.expToNext > 0 && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>EXP</span>
              <span>{g.exp}/{g.expToNext}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${expPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["members", ko ? "길드원" : ja ? "メンバー" : "Members"],
          ["boss", ko ? "보스전" : ja ? "ボス戦" : "Boss"],
          ["board", ko ? "게시판" : ja ? "掲示板" : "Board"],
          ...(canManage ? [["applications", ko ? "가입 신청" : ja ? "参加申請" : "Applications"] as [Tab, string]] : []),
          ["settings", ko ? "설정" : ja ? "設定" : "Settings"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === key ? "bg-primary/80 text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {label}
            {key === "applications" && pendingApps.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                {pendingApps.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 길드원 탭 */}
      {tab === "members" && (
        <div className="space-y-1.5">
          {g.members.map((m, i) => (
            <div key={m.userId} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
              <span className="w-4 shrink-0 text-center text-[11px] font-bold text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-foreground">{m.nickname}</p>
                  <RoleBadge role={m.role} ko={ko} ja={ja} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {ko ? "누적 기여도" : ja ? "累計貢献度" : "Total contribution"} {m.totalContribution}
                </p>
              </div>
              {isOwner && m.userId !== userId && m.role !== "owner" && (
                <div className="flex shrink-0 items-center gap-1">
                  {m.role === "member" ? (
                    <button
                      disabled={busy}
                      onClick={() => handleSetRole(m.userId, "officer")}
                      title={ko ? "부길드장 임명" : ja ? "副ギルド長に任命" : "Promote to officer"}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => handleSetRole(m.userId, "member")}
                      title={ko ? "직책 해제" : ja ? "役職解除" : "Demote to member"}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
                    >
                      <ShieldHalf className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() =>
                      setConfirmAction({
                        label: ko ? `${m.nickname}에게 길드장을 위임할까요?` : ja ? `${m.nickname}にギルド長を譲渡しますか？` : `Transfer ownership to ${m.nickname}?`,
                        run: () => { setConfirmAction(null); handleTransfer(m.userId); },
                      })
                    }
                    title={ko ? "길드장 위임" : ja ? "ギルド長譲渡" : "Transfer ownership"}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      setConfirmAction({
                        label: ko ? `${m.nickname}을(를) 추방할까요?` : ja ? `${m.nickname}を追放しますか？` : `Kick ${m.nickname}?`,
                        run: () => { setConfirmAction(null); handleKick(m.userId); },
                      })
                    }
                    title={ko ? "추방" : ja ? "追放" : "Kick"}
                    className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {canManage && !isOwner && m.role === "member" && m.userId !== userId && (
                <button
                  disabled={busy}
                  onClick={() =>
                    setConfirmAction({
                      label: ko ? `${m.nickname}을(를) 추방할까요?` : ja ? `${m.nickname}を追放しますか？` : `Kick ${m.nickname}?`,
                      run: () => { setConfirmAction(null); handleKick(m.userId); },
                    })
                  }
                  className="shrink-0 rounded-md p-1.5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 보스전 탭 */}
      {tab === "boss" && (
        <div className="space-y-3">
          {!bossState ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-2">
                <div className="flex justify-center">
                  <PixelCharacter characterId={bossState.bossId} size={72} />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>HP</span>
                    <span>{bossState.hpRemaining}/{bossState.maxHp}</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive transition-all"
                      style={{ width: `${Math.round((bossState.hpRemaining / bossState.maxHp) * 100)}%` }}
                    />
                  </div>
                </div>
                {bossState.cleared && (
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-primary">
                    <Sparkles className="w-4 h-4" />
                    {ko ? "이번 주 보스 처치 완료!" : ja ? "今週のボス討伐完了！" : "Boss defeated this week!"}
                  </p>
                )}
                <button
                  disabled={attacking || bossState.cleared || bossState.attacksRemaining <= 0}
                  onClick={() => void handleAttack()}
                  className="mx-auto flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-40"
                >
                  <Swords className="w-4 h-4" />
                  {ko ? "공격하기" : ja ? "攻撃する" : "Attack"}
                  {" "}({bossState.attacksRemaining}/{bossState.dailyAttacksMax})
                </button>
                {lastAttack && (
                  <p className="text-xs text-muted-foreground">
                    {ko ? `데미지 ${lastAttack.damageDealt} 적중!` : ja ? `ダメージ${lastAttack.damageDealt}命中！` : `Dealt ${lastAttack.damageDealt} damage!`}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {ko ? "내 기여도" : ja ? "自分の貢献度" : "My contribution"}: {bossState.myContribution}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {ko ? "내 레이드 덱" : ja ? "自分のレイドデッキ" : "My Raid Deck"}
                  </p>
                  <button
                    onClick={openDeckEditor}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    {ko ? "편집" : ja ? "編集" : "Edit"}
                  </button>
                </div>
                {raidDeck.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    {ko ? "덱을 설정하지 않으면 보유 케보몬 중 하나가 자동으로 사용돼요."
                      : ja ? "デッキを設定しないと、保有ケボモンの中から自動で使われます。"
                      : "If you don't set a deck, one of your Kebomon is used automatically."}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    {raidDeck.map((id) => (
                      <div key={id} className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40">
                        <PixelCharacter characterId={id} size={32} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {ko ? "기여도 랭킹" : ja ? "貢献度ランキング" : "Contribution Ranking"}
                </p>
                {bossState.topContributors.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {ko ? "아직 공격한 길드원이 없어요." : ja ? "まだ攻撃したメンバーがいません。" : "No one has attacked yet."}
                  </p>
                )}
                {bossState.topContributors.map((c) => (
                  <div key={c.userId} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-1.5">
                    <span className="w-4 shrink-0 text-center text-[11px] font-bold text-muted-foreground">{c.rank}</span>
                    <p className="flex-1 truncate text-sm text-foreground">{c.nickname}</p>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">{c.damage}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 게시판 탭 */}
      {tab === "board" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <textarea
              value={boardContent}
              onChange={(e) => setBoardContent(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={ko ? "길드원들에게 하고 싶은 말을 남겨보세요" : ja ? "ギルドメンバーへのメッセージを残してみましょう" : "Share something with your guild"}
              className="w-full resize-none rounded-lg border border-border bg-input-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              disabled={!boardContent.trim() || postingBoard}
              onClick={() => void handlePostToBoard()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50 ml-auto"
            >
              <Send className="w-3.5 h-3.5" />
              {ko ? "작성" : ja ? "投稿" : "Post"}
            </button>
          </div>

          {!boardLoaded ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : boardPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {ko ? "아직 게시글이 없어요." : ja ? "まだ投稿がありません。" : "No posts yet."}
            </p>
          ) : (
            boardPosts.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{p.authorName}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{p.content}</p>
                {p.imageUrl && (
                  <img src={p.imageUrl} alt="" className="max-h-64 w-full rounded-lg object-cover" />
                )}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleToggleBoardLike(p.id)}
                    className={`flex items-center gap-1 text-xs transition-colors ${p.isLiked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${p.isLiked ? "fill-current" : ""}`} />
                    {p.likes}
                  </button>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {p.commentCount}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 가입 신청 탭 */}
      {tab === "applications" && canManage && (
        <div className="space-y-1.5">
          {pendingApps.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {ko ? "대기 중인 신청이 없습니다." : ja ? "保留中の申請がありません。" : "No pending applications."}
            </p>
          )}
          {pendingApps.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.user?.name}</p>
                {a.message && <p className="truncate text-xs text-muted-foreground">{a.message}</p>}
              </div>
              <button
                disabled={busy}
                onClick={() => handleApprove(a.id)}
                className="shrink-0 rounded-md bg-primary p-1.5 text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={busy}
                onClick={() => handleReject(a.id)}
                className="shrink-0 rounded-md bg-muted p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 설정 탭 */}
      {tab === "settings" && (
        <div className="space-y-4">
          {canManage && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{ko ? "아이콘" : ja ? "アイコン" : "Icon"}</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(GUILD_ICON_MAP).map((iconId) => (
                  <button
                    key={iconId}
                    disabled={busy}
                    onClick={() => handleUpdateIcon(iconId)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 transition-all disabled:opacity-50 ${
                      g.iconId === iconId ? "ring-2 ring-primary" : "hover:bg-primary/20"
                    }`}
                  >
                    <GuildIcon iconId={iconId} className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {canManage && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{ko ? "공지" : ja ? "お知らせ" : "Notice"}</p>
              <textarea
                value={noticeDraft}
                onChange={(e) => setNoticeDraft(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-input-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                disabled={busy}
                onClick={handleSaveNotice}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
              >
                {ko ? "저장" : ja ? "保存" : "Save"}
              </button>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            {!isOwner && (
              <button
                disabled={busy}
                onClick={() =>
                  setConfirmAction({
                    label: ko ? "길드를 탈퇴할까요?" : ja ? "ギルドを脱退しますか？" : "Leave this guild?",
                    run: () => { setConfirmAction(null); handleLeave(); },
                  })
                }
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {ko ? "길드 탈퇴" : ja ? "ギルド脱退" : "Leave Guild"}
              </button>
            )}
            {isOwner && g.members.length === 1 && (
              <button
                disabled={busy}
                onClick={() =>
                  setConfirmAction({
                    label: ko ? "길드를 해체할까요? 되돌릴 수 없습니다." : ja ? "ギルドを解体しますか？元に戻せません。" : "Disband this guild? This cannot be undone.",
                    run: () => { setConfirmAction(null); handleDisband(); },
                  })
                }
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/40 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {ko ? "길드 해체" : ja ? "ギルド解体" : "Disband Guild"}
              </button>
            )}
            {isOwner && g.members.length > 1 && (
              <p className="text-[11px] text-muted-foreground">
                {ko ? "길드장은 다른 길드원에게 위임한 후 탈퇴할 수 있어요. (길드원 탭에서 위임)"
                  : ja ? "ギルド長は他のメンバーに譲渡してから脱退できます。（メンバータブで譲渡）"
                  : "Transfer ownership to another member before leaving (see Members tab)."}
              </p>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.label}
          onConfirm={confirmAction.run}
          onCancel={() => setConfirmAction(null)}
          busy={busy}
          ko={ko}
          ja={ja}
        />
      )}

      {replayResult && (
        <BattleReplay
          result={{
            log: replayResult.log,
            attackerChars: replayResult.attackerChars,
            defenderChars: replayResult.defenderChars,
          }}
          onDone={() => setReplayResult(null)}
        />
      )}

      {showDeckEditor && (
        <RaidDeckModal
          ownedIds={rewardSummary.ownedCharacterIds}
          selected={deckDraft}
          onToggle={toggleDeckChar}
          onSave={() => void handleSaveDeck()}
          onClose={() => setShowDeckEditor(false)}
          saving={savingDeck}
          ko={ko}
          ja={ja}
        />
      )}
    </div>
  );
}
