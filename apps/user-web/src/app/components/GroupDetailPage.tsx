import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowLeft, Users, Crown, Calendar, TrendingUp,
  Copy, Check, UserPlus, Plus, X, ChevronRight,
  LogOut, Trash2, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle, UserCheck,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { CurrencyCode } from "../types/domain";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS } from "../data/characters";
import type { CharacterDef } from "../data/characters";

interface GroupMember {
  id: string;
  name: string;
  isHost: boolean;
  equippedCharacterId: number | null;
  profilePhoto?: string | null;
}

interface Group {
  id: string;
  name: string;
  code: string;
  isPublic: boolean;
  codeExpiresAt: string | null;
  members: GroupMember[];
  isHost: boolean;
}

interface JoinRequest {
  id: number;
  groupId: string;
  userName: string;
  createdAt: string;
}

interface LocalExpense {
  id: string;
  date: string;
  category: string;
  spentAmount: number;
  spentCurrency: CurrencyCode;
  memo: string;
  participants?: number;
}

function getMemberCharacter(equippedCharacterId: number | null): CharacterDef {
  if (equippedCharacterId == null) return CHARACTERS[0];
  return CHARACTERS.find((c) => c.id === equippedCharacterId) ?? CHARACTERS[0];
}

const CATEGORY_EMOJI: Record<string, string> = {
  식비: "🍜", 교통: "🚌", 카페: "☕", 쇼핑: "🛍", 숙박: "🏨", 엔터테인먼트: "🎭", 기타: "💳",
};

export default function GroupDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, profilePhoto, isLoading } = useAppData();
  const { t } = useLang();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [group, setGroup] = useState<Group | undefined>(location.state?.group);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<any[]>([]);

  const [showInvite, setShowInvite] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [localExpenses] = useState<LocalExpense[]>([]);
  const groupIdRef = useRef<string | undefined>(undefined);

  /* ── Group management ── */
  const [showManage, setShowManage] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedNewHost, setSelectedNewHost] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshGroup = async (groupId: string) => {
    try {
      const updated = await api.get<Group>(`/groups/${groupId}`);
      setGroup(updated);
    } catch {
      // group no longer accessible (deleted/kicked)
    }
  };


  /* ── Group management handlers ── */
  const handleDeleteGroup = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await api.delete(`/groups/${group.id}`);
      navigate("/groups");
    } catch (e: any) {
      showToast(e.message || "그룹 삭제에 실패했습니다.");
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleTransferHost = async () => {
    if (!group || !selectedNewHost) return;
    setActionLoading(true);
    try {
      const updated = await api.patch<Group>(`/groups/${group.id}/host`, { newHostId: selectedNewHost });
      setGroup(updated);
      setShowTransferModal(false);
      setShowManage(false);
      setSelectedNewHost("");
    } catch (e: any) {
      showToast(e.message || "호스트 양도에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group) return;
    setActionLoading(true);
    try {
      await api.delete(`/groups/${group.id}/members/me`);
      navigate("/groups");
    } catch (e: any) {
      showToast(e.message || "그룹 탈퇴에 실패했습니다.");
    } finally {
      setActionLoading(false);
      setShowLeaveConfirm(false);
    }
  };

  useEffect(() => {
    if (!group?.id) return;
    groupIdRef.current = group.id;
    const socket = getSocket();
    socket.emit("joinRoom", { groupId: group.id });

    socket.on("group:joinRequest", (req: JoinRequest) => {
      setJoinRequests((prev) => {
        if (prev.some((r) => r.id === req.id)) return prev;
        return [...prev, req];
      });
    });

    socket.on("group:requestHandled", ({ requestId, action }: { requestId: number; action: string }) => {
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === "APPROVED" && groupIdRef.current) {
        refreshGroup(groupIdRef.current);
      }
    });

    return () => {
      socket.emit("leaveRoom", { groupId: group.id });
      socket.off("group:joinRequest");
      socket.off("group:requestHandled");
    };
  }, [group?.id]);

  useEffect(() => {
    if (!group?.id) return;
    api.get<any[]>(`/groups/${group.id}/expenses`)
      .then(setGroupExpenses)
      .catch(console.error);
  }, [group?.id]);

  useEffect(() => {
    if (!group?.isHost) return;
    api.get<any[]>(`/groups/${group.id}/requests`)
      .then((requests) =>
        setJoinRequests(
          requests.map((r) => ({
            id: r.id,
            groupId: group.id,
            userName: r.user.name,
            createdAt: r.createdAt,
          })),
        ),
      )
      .catch(console.error);
  }, [group?.id, group?.isHost]);

  const handleApproveRequest = async (req: JoinRequest) => {
    if (!group) return;
    try {
      await api.patch(`/groups/${req.groupId}/requests/${req.id}`, { action: "APPROVED" });
      setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
      await refreshGroup(group.id);
    } catch (e: any) {
      showToast(e.message || "승인에 실패했습니다.");
    }
  };

  const handleRejectRequest = async (req: JoinRequest) => {
    try {
      await api.patch(`/groups/${req.groupId}/requests/${req.id}`, { action: "REJECTED" });
      setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e: any) {
      showToast(e.message || "거절에 실패했습니다.");
    }
  };

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Users className="w-12 h-12 mb-4 opacity-30" />
        <p className="mb-4">{t("group.not_found")}</p>
        <button
          onClick={() => navigate("/groups")}
          className="bg-primary/80 text-primary-foreground rounded px-4 py-2 text-sm font-medium"
        >
          {t("group.back_to_list")}
        </button>
      </div>
    );
  }

  const isCurrentUser = (m: { id: string }) => m.id === profile.id;

  const copyCode = () => {
    navigator.clipboard.writeText(group.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const allExpenses = groupExpenses;

  const goToExpenses = (openForm = false) =>
    navigate(`/groups/${group.id}/expenses`, { state: { group, localExpenses, openForm } });

  const nonHostMembers = group.members.filter((m) => !m.isHost);

  return (
    <>
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-3 max-w-sm w-[90vw] ${
          toast.type === "success" ? "bg-card border-primary/40" : "bg-card border-destructive/40"
        }`}>
          {toast.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
            : <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />}
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button onClick={() => setToast(null)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/groups")}
            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2>{group.name}</h2>
              {group.isHost && <Crown className="w-5 h-5 text-amber-500" />}
            </div>
          </div>
          <button
            onClick={() => {
              const opening = !showInvite;
              setShowInvite(opening);
              if (opening) {
                navigator.clipboard.writeText(group.code).catch(() => {});
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
                showToast("초대 코드가 복사됐습니다.", "success");
              }
            }}
            className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-all ${
              showInvite
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-muted hover:bg-muted/70 text-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            {t("group.invite")}
          </button>
        </div>

        {/* 초대 코드 패널 */}
        {showInvite && (
          <div className="bg-card rounded-md border border-primary/20 p-5">
            <p className="text-sm text-muted-foreground mb-3">{t("group.share_code")}</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded px-4 py-3 font-mono text-xl font-bold text-center tracking-widest">
                {group.code}
              </div>
              <button
                onClick={copyCode}
                className="bg-primary/80 text-primary-foreground rounded px-4 py-3 flex items-center gap-2 transition-all hover:shadow-md"
              >
                {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {codeCopied ? t("group.copied") : t("group.copy")}
              </button>
            </div>
          </div>
        )}

        {/* 가입 신청 목록 (호스트 전용) */}
        {group.isHost && joinRequests.length > 0 && (
          <div className="bg-card rounded-md border border-primary/20 p-5 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <UserCheck className="w-4 h-4 text-primary" />
              가입 신청
              <span className="ml-auto bg-destructive text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                {joinRequests.length}
              </span>
            </h3>
            <div className="space-y-2">
              {joinRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 bg-muted rounded-md p-3">
                  <div className="w-8 h-8 rounded-full bg-primary/70 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {req.userName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.userName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleApproveRequest(req)}
                      className="bg-primary/80 text-primary-foreground rounded px-3 py-1.5 text-xs font-medium hover:shadow-md transition-all"
                    >
                      {t("groups.approve")}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req)}
                      className="bg-destructive/10 text-destructive rounded px-3 py-1.5 text-xs font-medium hover:bg-destructive/20 transition-all"
                    >
                      {t("groups.reject")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="bg-card rounded-md border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {t("group.members")}
            </h3>
            <span className="text-sm text-muted-foreground">{group.members.length}{t("group.member_suffix")}</span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {group.members.map((member) => {
              const isMe = isCurrentUser(member);
              const char = getMemberCharacter(member.equippedCharacterId);
              return (
                <div
                  key={member.id}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className="flex items-end">
                    <div
                      className={`p-[2.5px] rounded-full ${
                        member.isHost
                          ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                          : "border-2 border-transparent"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/70 to-accent/80 flex items-center justify-center overflow-hidden">
                        {(isMe ? profilePhoto : member.profilePhoto)
                          ? <img src={(isMe ? profilePhoto : member.profilePhoto)!} alt={member.name} className="w-full h-full object-cover" />
                          : <span className="text-white font-bold text-lg leading-none">{member.name[0]}</span>}
                      </div>
                    </div>
                    <div className="-ml-3">
                      <PixelSprite type={char.type} colors={char.colors} size={40} rarity={char.rarity} />
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-center w-full truncate leading-tight max-w-[72px]">
                    {member.name}
                  </p>
                  {member.isHost ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                      <Crown className="w-2.5 h-2.5" />
                      {t("group.host")}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40">{t("group.member")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 그룹 지출 */}
        <div className="bg-card rounded-md border border-border overflow-hidden">
          <button
            onClick={() => goToExpenses(false)}
            className="w-full flex items-center justify-between px-5 pt-4 pb-3 hover:bg-muted/50 transition-colors"
          >
            <h3 className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {t("group.expenses")}
              {allExpenses.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">· {allExpenses.length}건</span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("group.view_all")}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>

          <div className="px-5 pb-4 space-y-3">
            <button
              onClick={() => goToExpenses(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all border border-dashed border-primary/40 text-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4" />
              {t("group.add_expense")}
            </button>

            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted animate-pulse">
                    <div className="w-10 h-10 rounded-md bg-muted-foreground/20 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                      <div className="h-2.5 bg-muted-foreground/20 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : allExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("group.no_expenses")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allExpenses.slice(0, 3).map((expense) => (
                  <div key={expense.id} className="flex items-center gap-3 p-3 rounded-md bg-muted">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-lg shrink-0">
                      {CATEGORY_EMOJI[expense.category] ?? "💳"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.memo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {expense.date} · {t(`cat.${expense.category}` as Parameters<typeof t>[0])}
                        {"participants" in expense && expense.participants ? ` · ${expense.participants}명` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-primary leading-tight">
                        {expense.spentCurrency === "JPY"
                          ? `¥${expense.spentAmount.toLocaleString()} → ₩${expense.baseAmount.toLocaleString()}`
                          : `₩${expense.spentAmount.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                ))}
                {allExpenses.length > 3 && (
                  <button
                    onClick={() => navigate(`/groups/${group.id}/expenses`, { state: { group, localExpenses } })}
                    className="w-full text-center text-xs text-muted-foreground hover:text-primary py-2 transition-colors"
                  >
                    +{allExpenses.length - 3}{t("expense.count_suffix")} {t("group.view_more")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 그룹 관리 ── */}
        <div className="bg-card rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setShowManage(!showManage)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
          >
            <h3 className="text-sm font-medium text-muted-foreground">
              {group.isHost ? t("group.management") : t("group.settings")}
            </h3>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showManage ? "rotate-90" : ""}`} />
          </button>

          {showManage && (
            <div className="px-5 pb-4 space-y-2 border-t border-border">
              {group.isHost ? (
                <>
                  <button
                    onClick={() => { setShowManage(false); setShowTransferModal(true); }}
                    disabled={nonHostMembers.length === 0}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t("group.transfer_host")}</p>
                      <p className="text-xs text-muted-foreground">{t("group.transfer_host_desc")}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-destructive/10 transition-colors text-left"
                  >
                    <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-destructive">{t("group.delete")}</p>
                      <p className="text-xs text-muted-foreground">{t("group.delete_desc")}</p>
                    </div>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-destructive/10 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">{t("group.leave")}</p>
                    <p className="text-xs text-muted-foreground">{t("group.leave_desc")}</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 호스트 양도 모달 ── */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="mb-1">{t("group.transfer_host")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("group.transfer_select")}</p>
            <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
              {nonHostMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedNewHost(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md border transition-all text-left ${
                    selectedNewHost === m.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center text-white font-bold shrink-0">
                    {m.name[0]}
                  </div>
                  <span className="font-medium text-sm">{m.name}</span>
                  {selectedNewHost === m.id && <Check className="w-4 h-4 text-primary ml-auto" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowTransferModal(false); setSelectedNewHost(""); }}
                className="flex-1 py-2.5 rounded-md bg-muted text-muted-foreground text-sm font-medium"
              >
                {t("settings.cancel")}
              </button>
              <button
                onClick={handleTransferHost}
                disabled={!selectedNewHost || actionLoading}
                className="flex-1 py-2.5 rounded-md bg-primary/80 text-primary-foreground text-sm font-medium disabled:opacity-40"
              >
                {actionLoading ? t("group.processing") : t("group.transfer_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 그룹 삭제 확인 모달 ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <h3 className="text-destructive">{t("group.delete")}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-semibold text-foreground">"{group.name}"</span> {t("group.delete_confirm_suffix")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-md bg-muted text-muted-foreground text-sm font-medium"
              >
                {t("settings.cancel")}
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-md bg-destructive text-white text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? t("group.deleting") : t("group.delete_btn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 그룹 탈퇴 확인 모달 ── */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="mb-3">{t("group.leave")}</h3>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-semibold text-foreground">"{group.name}"</span> {t("group.leave_confirm_suffix")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded-md bg-muted text-muted-foreground text-sm font-medium"
              >
                {t("settings.cancel")}
              </button>
              <button
                onClick={handleLeaveGroup}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-md bg-destructive text-white text-sm font-medium disabled:opacity-50"
              >
                {actionLoading ? t("group.processing") : t("group.leave_btn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
