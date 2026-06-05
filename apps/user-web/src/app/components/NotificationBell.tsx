import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, MessageSquare, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { getSocket } from "../lib/socket";
import { useLang } from "../context/LangContext";

type Notif = {
  id: string;
  type: "comment" | "achievement";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
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

export default function NotificationBell({ navStyle = false }: { navStyle?: boolean }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const onClickItem = (n: Notif) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const Dropdown = ({ pos }: { pos: string }) => (
    <div className={`absolute ${pos} z-50 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-xl`}>
      <div className="border-b border-border px-4 py-2.5 text-sm font-bold">{t("notification.title")}</div>
      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("notification.empty")}</div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => onClickItem(n)}
              className={`flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-sidebar-accent ${
                n.isRead ? "" : "bg-primary/5"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {n.type === "comment" ? (
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                ) : (
                  <Trophy className="h-4 w-4 text-amber-400" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{n.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.createdAt, lang)}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.body}</span>
              </span>
              {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </button>
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
          {unread > 0 && (
            <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {open && <Dropdown pos="left-full top-0 ml-2" />}
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
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && <Dropdown pos="right-0 top-full mt-2" />}
    </div>
  );
}
