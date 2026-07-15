import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Crown, ShieldHalf, Swords, Plus, Search, X, Check,
  UserMinus, LogOut, Loader2, Sparkles, ArrowUpCircle,
} from "lucide-react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { useLang } from "../context/LangContext";
import PixelCharacter from "./PixelCharacter";
import type {
  GuildSummary,
  GuildDetail,
  GuildApplicationInfo,
  GuildBossState,
  GuildAttackResult,
  GuildRole,
} from "../types/domain";

type Tab = "members" | "boss" | "applications" | "settings";

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
  const [applyTarget, setApplyTarget] = useState<GuildSummary | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attacking, setAttacking] = useState(false);
  const [lastAttack, setLastAttack] = useState<GuildAttackResult | null>(null);
  const [noticeDraft, setNoticeDraft] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ label: string; run: () => void } | null>(null);

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

  const init = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const g = await api.get<GuildDetail | null>(`/guild/mine?userId=${userId}`);
      setMyGuild(g);
      if (g) {
        await loadBossState();
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
  }, [userId, loadBossState, loadPendingApps, loadBrowse, ko, ja]);

  useEffect(() => { void init(); }, [init]);

  useEffect(() => {
    if (myGuild) setNoticeDraft(myGuild.notice ?? "");
  }, [myGuild?.id]);

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
      api.post("/guild/create", { userId, name: createName.trim(), notice: createNotice.trim() || undefined }),
      async () => { setShowCreate(false); setCreateName(""); setCreateNotice(""); await init(); },
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
      await loadBossState();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAttacking(false);
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Crown className="w-5 h-5" />
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Crown className="w-6 h-6" />
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
    </div>
  );
}
