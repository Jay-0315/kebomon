import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, MessageSquare, Trophy, Award, CalendarCheck, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { getSocket } from "../lib/socket";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";

type Notif = {
  id: string;
  type: "comment" | "achievement" | "title" | "attendance";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  isLocal?: boolean;
};

function timeAgo(iso: string, lang: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "ja" ? "たった今" : "방금";
  if (m < 60) return lang === "ja" ? `${m}分前` : `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "ja" ? `${h}時間前` : `${h}시간 전`;
  const d = Math.floor(h / 24);
  return lang === "ja" ? `${d}日前` : `${d}일 전`;
}

function NotifIcon({ type }: { type: Notif["type"] }) {
  if (type === "comment") return <MessageSquare className="h-4 w-4 text-blue-400" />;
  if (type === "achievement") return <Trophy className="h-4 w-4 text-amber-400" />;
  if (type === "title") return <Award className="h-4 w-4 text-purple-400" />;
  return <CalendarCheck className="h-4 w-4 text-green-400" />;
}

export default function NotificationBell({ navStyle = false }: { navStyle?: boolean }) {
  const { t, lang } = useLang();
  const { rewardSummary } = useAppData();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const attendanceReminder: Notif = {
    id: "attendance-reminder",
    type: "attendance",
    title: t("notification.attendance_reminder"),
    body: t("notification.attendance_reminder_body"),
    link: "/attendance",
    isRead: false,
    createdAt: new Date().toISOString(),
    isLocal: true,
  };

  const allItems = (!rewardSummary.attendanceClaimedToday)
    ? [attendanceReminder, ...items]
    : items;

  const displayUnread = !rewardSummary.attendanceClaimedToday ? unread + 1 : unread;

  const load = async () => {
    const u = getStoredUser();
    if (!u) return;
    try {
      const [list, cnt] = await Promise.all([
        api.get<Notif[]>(`/notifications?userId=${u.id}`),
        api.get<{ count: number }>(`/notifications/unread-count?userId=${u.id}`),
      ]);
      setItems(list);
      setUnread(cnt.count);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const u = getStoredUser();
    const s = getSocket();
    if (u) s.emit("joinUser", { userId: u.id });
    const onNotif = (n: Notif) => {
      setItems((p) => [n, ...p].slice(0, 30));
      setUnread((c) => c + 1);
    };
    s.on("notification", onNotif);
    return () => { s.off("notification", onNotif); };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const u = getStoredUser();
      if (u) {
        api.post("/notifications/read-all", { userId: u.id }).catch(() => undefined);
        setUnread(0);
        setItems((p) => p.map((n) => ({ ...n, isRead: true })));
      }
    }
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const u = getStoredUser();
    setItems((p) => p.filter((n) => n.id !== id));
    if (u) {
      api.delete(`/notifications/${id}?userId=${u.id}`).catch(() => undefined);
    }
  };

  const clearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const u = getStoredUser();
    setItems([]);
    setUnread(0);
    if (u) {
      api.delete(`/notifications?userId=${u.id}`).catch(() => undefined);
    }
  };

  const onClickItem = (n: Notif) => {
    if (!n.isLocal) {
      const u = getStoredUser();
      setItems((p) => p.filter((item) => item.id !== n.id));
      if (u) {
        api.delete(`/notifications/${n.id}?userId=${u.id}`).catch(() => undefined);
      }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const Dropdown = ({ pos }: { pos: string }) => (
    <div className={`absolute ${pos} z-50 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-xl`}>
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-bold">{t("notification.title")}</span>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            {t("notification.clear_all")}
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {allItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("notification.empty")}</div>
        ) : (
          allItems.map((n) => (
            <div
              key={n.id}
              className={`relative flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-sidebar-accent cursor-pointer group ${
                n.isRead ? "" : "bg-primary/5"
              }`}
              onClick={() => onClickItem(n)}
            >
              <span className="mt-0.5 shrink-0">
                <NotifIcon type={n.type} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.createdAt, lang)}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.body}</span>
              </span>
              {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              {!n.isLocal && (
                <button
                  onClick={(e) => deleteNotif(n.id, e)}
                  className="absolute right-2 top-2 hidden group-hover:flex items-center justify-center h-5 w-5 rounded-full bg-muted hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (navStyle) {
    return (
      <div ref={ref} className="relative w-full">
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <Bell className="h-5 w-5 shrink-0" />
          <span>{t("notification.title")}</span>
          {displayUnread > 0 && (
            <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {displayUnread > 9 ? "9+" : displayUnread}
            </span>
          )}
        </button>
        {open && <Dropdown pos="left-[calc(100%+1rem)] top-0" />}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-sidebar-accent"
        title={t("notification.title")}
      >
        <Bell className="h-5 w-5" />
        {displayUnread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {displayUnread > 9 ? "9+" : displayUnread}
          </span>
        )}
      </button>
      {open && <Dropdown pos="right-0 top-full mt-2" />}
    </div>
  );
}
