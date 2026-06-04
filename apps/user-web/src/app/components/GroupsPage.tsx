import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  X,
  Users,
  Crown,
  Search,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { api } from "../lib/api";

interface GroupMember {
  id: string;
  name: string;
  isHost: boolean;
  profilePhoto?: string | null;
}

interface Group {
  id: string;
  name: string;
  code: string;
  isPublic: boolean;
  codeExpiresAt: string | null;
  isHost: boolean;
  members: GroupMember[];
}

interface JoinRequest {
  id: number;
  groupId: string;
  groupName: string;
  userName: string;
  createdAt: string;
}

interface AvailableGroup {
  id: string;
  name: string;
  memberCount: number;
  hostName: string;
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { profile, profilePhoto } = useAppData();

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<AvailableGroup[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinMethod, setJoinMethod] = useState<"code" | "request">("code");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchJoinRequestsForGroups = async (myGroups: Group[]) => {
    const hostGroups = myGroups.filter((g) => g.isHost);
    const allRequests: JoinRequest[] = [];
    for (const group of hostGroups) {
      try {
        const requests = await api.get<any[]>(`/groups/${group.id}/requests`);
        allRequests.push(
          ...requests.map((r) => ({
            id: r.id,
            groupId: group.id,
            groupName: group.name,
            userName: r.user.name,
            createdAt: r.createdAt,
          })),
        );
      } catch (e) {
        console.error(e);
      }
    }
    setJoinRequests(allRequests);
  };

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const [myGroups, allPublic] = await Promise.all([
        api.get<Group[]>("/groups"),
        api.get<AvailableGroup[]>("/groups/search"),
      ]);
      setGroups(myGroups);
      setPublicGroups(allPublic);
      await fetchJoinRequestsForGroups(myGroups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (joinMethod !== "request") return;
    const timer = setTimeout(() => {
      api
        .get<AvailableGroup[]>(
          `/groups/search?q=${encodeURIComponent(searchQuery)}`,
        )
        .then(setAvailableGroups)
        .catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, joinMethod]);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const group = await api.post<Group>("/groups", {
        name: newGroupName,
        isPublic: newGroupIsPublic,
      });
      setGroups((prev) => [...prev, group]);
      setNewGroupName("");
      setNewGroupIsPublic(false);
      setShowCreateForm(false);
    } catch (e: any) {
      showToast(e.message || "그룹 생성에 실패했습니다.");
    }
  }

  async function handleJoinWithCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const group = await api.post<Group>("/groups/join", { code: joinCode });
      setGroups((prev) => [...prev, group]);
      setJoinCode("");
      setShowJoinForm(false);
    } catch (e: any) {
      showToast(e.message || "그룹 참가에 실패했습니다.");
    }
  }

  async function handleRequestJoin(group: AvailableGroup) {
    try {
      await api.post(`/groups/${group.id}/requests`);
      showToast(
        `${group.name}에 가입 요청을 보냈습니다. 호스트의 승인을 기다려주세요.`,
        "success",
      );
      setShowJoinForm(false);
      setPublicGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch (e: any) {
      showToast(e.message || "가입 요청에 실패했습니다.");
    }
  }

  const filteredGroups = availableGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const discoverableGroups = publicGroups.filter(
    (pg) => !groups.some((g) => g.id === pg.id),
  );

  const MAX_VISIBLE_AVATARS = 4;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium transition-all animate-in fade-in slide-in-from-top-3 max-w-sm w-[90vw] ${
            toast.type === "success"
              ? "bg-card border-primary/40 text-foreground"
              : "bg-card border-destructive/40 text-foreground"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
          )}
          <p className="flex-1 leading-snug">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="shrink-0">{t("groups.title")}</h2>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowJoinForm(true)}
            title="그룹 참가"
            className="bg-secondary text-secondary-foreground rounded-md w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            title="그룹 생성"
            className="bg-primary/80 text-primary-foreground rounded-md w-10 h-10 flex items-center justify-center shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Group Cards Grid */}
      {loading ? (
        <p className="text-center text-muted-foreground py-12">
          {t("groups.loading") || "로딩 중..."}
        </p>
      ) : groups.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {t("groups.no_groups") || "참가한 그룹이 없습니다."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => {
            const visibleMembers = group.members.slice(0, MAX_VISIBLE_AVATARS);
            const extraCount = group.members.length - MAX_VISIBLE_AVATARS;
            const pendingCount = joinRequests.filter(
              (r) => r.groupId === group.id,
            ).length;

            return (
              <button
                key={group.id}
                onClick={() =>
                  navigate(`/groups/${group.id}`, { state: { group } })
                }
                className="relative bg-card rounded-md p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left group"
              >
                {pendingCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 bg-destructive text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                    {pendingCount}
                  </span>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="group-hover:text-primary transition-colors">
                        {group.name}
                      </h3>
                      {group.isHost && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {t("group.member")} {group.members.length}
                        {t("groups.member_suffix")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                <div className="flex items-center gap-1.5">
                  {visibleMembers.map((member) => (
                    <div
                      key={member.id}
                      className="relative w-9 h-9 shrink-0"
                      title={member.name}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center text-white text-sm font-medium ring-2 ring-card overflow-hidden">
                        {(() => {
                          const photo =
                            member.id === profile.id
                              ? profilePhoto
                              : member.profilePhoto;
                          return photo ? (
                            <img
                              src={photo}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            member.name[0]
                          );
                        })()}
                      </div>
                      {member.isHost && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Crown className="w-2 h-2 text-white" />
                        </span>
                      )}
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium ring-2 ring-card">
                      +{extraCount}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Discoverable Public Groups */}
      {discoverableGroups.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Search className="w-4 h-4" />
            {t("groups.public_discover")}
          </h3>
          <div className="space-y-2">
            {discoverableGroups.map((group) => (
              <div
                key={group.id}
                className="bg-card rounded-md border border-border p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{group.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {group.memberCount}
                      {t("groups.member_suffix")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      {group.hostName}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRequestJoin(group)}
                  className="shrink-0 bg-primary/80 text-primary-foreground rounded px-3 py-1.5 text-xs font-medium hover:shadow-md transition-all"
                >
                  {t("groups.request")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className="bg-card rounded-md p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3>{t("groups.create")}</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">
                  {t("groups.group_name")}
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t("groups.name_placeholder")}
                  className="w-full px-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newGroupIsPublic}
                  onChange={(e) => setNewGroupIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">
                  {t("groups.public") || "공개 그룹으로 설정"}
                </span>
              </label>
              <div className="bg-muted rounded p-4 flex gap-3">
                <TrendingUp className="w-5 h-5 text-primary/80 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  {t("groups.create_hint")}
                </p>
              </div>
              <button
                type="submit"
                className="w-full bg-primary/80 text-primary-foreground rounded py-3 font-medium shadow-md hover:shadow-lg transition-all"
              >
                {t("groups.create_btn")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowJoinForm(false)}
        >
          <div
            className="bg-card rounded-md p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3>{t("groups.join")}</h3>
              <button
                onClick={() => setShowJoinForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setJoinMethod("code")}
                className={`flex-1 py-2 px-4 rounded font-medium transition-all ${
                  joinMethod === "code"
                    ? "bg-primary/80 text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent/30"
                }`}
              >
                {t("groups.join_code")}
              </button>
              <button
                onClick={() => setJoinMethod("request")}
                className={`flex-1 py-2 px-4 rounded font-medium transition-all ${
                  joinMethod === "request"
                    ? "bg-primary/80 text-primary-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-accent/30"
                }`}
              >
                {t("groups.request_join")}
              </button>
            </div>

            {joinMethod === "code" && (
              <form onSubmit={handleJoinWithCode} className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">
                    {t("groups.group_code")}
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder={t("groups.code_placeholder")}
                    maxLength={8}
                    className="w-full px-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring font-mono text-lg text-center"
                    required
                  />
                </div>
                <div className="bg-muted rounded p-4 flex gap-3">
                  <TrendingUp className="w-5 h-5 text-primary/80 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {t("groups.code_hint")}
                  </p>
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary/80 text-primary-foreground rounded py-3 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  {t("groups.join_now")}
                </button>
              </form>
            )}

            {joinMethod === "request" && (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm">
                    {t("groups.search_groups")}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("groups.search_placeholder")}
                      className="w-full pl-10 pr-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="bg-muted rounded p-4 flex gap-3">
                  <TrendingUp className="w-5 h-5 text-primary/80 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {t("groups.search_hint")}
                  </p>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredGroups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t("groups.no_results")}
                    </p>
                  ) : (
                    filteredGroups.map((group) => (
                      <div key={group.id} className="bg-muted rounded p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium mb-1">{group.name}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {group.memberCount}
                                {t("groups.member_suffix")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Crown className="w-4 h-4" />
                                {group.hostName}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRequestJoin(group)}
                            className="bg-primary/80 text-primary-foreground rounded px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                          >
                            {t("groups.request")}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
