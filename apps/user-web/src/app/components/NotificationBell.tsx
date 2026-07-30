import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  MessageSquare,
  Trophy,
  Award,
  CalendarCheck,
  Megaphone,
  ListChecks,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { getSocket, disconnectSocket, disconnectChatSocket, disconnectRaidSocket, disconnectDuelSocket } from "../lib/socket";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { type TranslationKey } from "../lib/i18n";

type Notif = {
  id: string;
  type: "comment" | "achievement" | "title" | "attendance" | "notice" | "quest";
  title: string;
  body: string;
  titleKey?: string | null;
  bodyKey?: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  isLocal?: boolean;
};

function timeAgo(iso: string, t: (k: TranslationKey) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("notification.time.just_now");
  if (m < 60)
    return t("notification.time.min_suffix").replace("{n}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t("notification.time.hr_suffix").replace("{h}", String(h));
  return t("notification.time.day_suffix").replace(
    "{d}",
    String(Math.floor(h / 24)),
  );
}

function NotifIcon({ type }: { type: Notif["type"] }) {
  if (type === "comment")
    return <MessageSquare className="h-4 w-4 text-blue-400" />;
  if (type === "achievement")
    return <Trophy className="h-4 w-4 text-amber-400" />;
  if (type === "title") return <Award className="h-4 w-4 text-purple-400" />;
  if (type === "notice") return <Megaphone className="h-4 w-4 text-pink-400" />;
  if (type === "quest") return <ListChecks className="h-4 w-4 text-emerald-400" />;
  return <CalendarCheck className="h-4 w-4 text-green-400" />;
}

export default function NotificationBell({
  navStyle = false,
  floating = false,
}: {
  navStyle?: boolean;
  floating?: boolean;
}) {
  const { t } = useLang();
  const { rewardSummary } = useAppData();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [detail, setDetail] = useState<Notif | null>(null);
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

  const allItems = !rewardSummary.attendanceClaimedToday
    ? [attendanceReminder, ...items]
    : items;

  const displayUnread = !rewardSummary.attendanceClaimedToday
    ? unread + 1
    : unread;

  const load = async () => {
    const u = getStoredUser();
    if (!u) return;
    try {
      const [list, cnt] = await Promise.all([
        api.get<Notif[]>(`/notifications?userId=${u.id}`),
        api.get<{ count: number }>(
          `/notifications/unread-count?userId=${u.id}`,
        ),
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
    // 관리자가 계정을 정지하면 서버가 이 이벤트를 보냄 — 이미 로그인된 세션도 즉시 로그아웃 처리
    const onForceLogout = () => {
      disconnectChatSocket();
      disconnectRaidSocket();
      disconnectDuelSocket();
      disconnectSocket();
      window.dispatchEvent(new CustomEvent("kebo:auth-expired"));
    };
    s.on("force-logout", onForceLogout);
    return () => {
      s.off("notification", onNotif);
      s.off("force-logout", onForceLogout);
    };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
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
        api
          .post("/notifications/read-all", { userId: u.id })
          .catch(() => undefined);
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

  const TYPE_TITLE_KEY: Partial<Record<Notif["type"], TranslationKey>> = {
    achievement: "notification.achievement_title",
    title:       "notification.season_title",
    attendance:  "notification.attendance_reminder",
  };
  const TYPE_BODY_KEY: Partial<Record<Notif["type"], TranslationKey>> = {
    achievement: "notification.achievement_body",
    title:       "notification.season_body",
    attendance:  "notification.attendance_reminder_body",
  };

  const getNotifText = (n: Notif) => ({
    title: n.titleKey
      ? t(n.titleKey as TranslationKey)
      : TYPE_TITLE_KEY[n.type]
        ? t(TYPE_TITLE_KEY[n.type]!)
        : n.title,
    body: n.bodyKey
      ? t(n.bodyKey as TranslationKey)
      : TYPE_BODY_KEY[n.type]
        ? t(TYPE_BODY_KEY[n.type]!)
        : n.body,
  });

  const consumeNotif = (n: Notif) => {
    if (n.isLocal) return;
    const u = getStoredUser();
    setItems((p) => p.filter((item) => item.id !== n.id));
    if (u) {
      api
        .delete(`/notifications/${n.id}?userId=${u.id}`)
        .catch(() => undefined);
    }
  };

  const onClickItem = (n: Notif) => {
    setOpen(false);
    setDetail(n);
  };

  const closeDetail = () => {
    if (detail) consumeNotif(detail);
    setDetail(null);
  };

  const goToLink = () => {
    if (!detail) return;
    const link = detail.link;
    consumeNotif(detail);
    setDetail(null);
    if (link) navigate(link);
  };

  const Dropdown = ({ posClass }: { posClass: string }) => (
    <div
      className={`${posClass} z-50 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-xl`}
    >
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
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("notification.empty")}
          </div>
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
                  <span className="truncate text-sm font-semibold">
                    {getNotifText(n).title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(n.createdAt, t)}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {getNotifText(n).body}
                </span>
              </span>
              {!n.isRead && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
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

  const DetailModal = () => {
    if (!detail) return null;
    const text = getNotifText(detail);
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        onClick={closeDetail}
      >
        <div
          className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <span className="flex items-center gap-2">
              <NotifIcon type={detail.type} />
              <span className="text-sm font-bold">{text.title}</span>
            </span>
            <button
              onClick={closeDetail}
              className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {text.body}
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {timeAgo(detail.createdAt, t)}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            {detail.link && (
              <button
                onClick={goToLink}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("notification.go_to")}
              </button>
            )}
            <button
              onClick={closeDetail}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-sidebar-accent"
            >
              {t("notification.exit")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (floating) {
    return (
      <div ref={ref}>
        <button
          onClick={toggle}
          title={t("notification.title")}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          <Bell className="h-6 w-6" />
          {displayUnread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {displayUnread > 9 ? "9+" : displayUnread}
            </span>
          )}
        </button>
        {open && <Dropdown posClass="fixed bottom-44 right-6" />}
        {detail && <DetailModal />}
      </div>
    );
  }

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
        {open && <Dropdown posClass="absolute left-[calc(100%+1rem)] top-0" />}
        {detail && <DetailModal />}
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
      {open && <Dropdown posClass="absolute right-0 top-full mt-2" />}
      {detail && <DetailModal />}
    </div>
  );
}
