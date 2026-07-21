import { useEffect, useState, type ReactNode } from "react";
import { Wrench, Sparkles, Swords, Users, MessagesSquare, CalendarCheck } from "lucide-react";
import { useLang } from "../context/LangContext";

function useCountdown(endsAt: string | null) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) {
      setRemainingMs(null);
      return;
    }
    const target = new Date(endsAt).getTime();
    const tick = () => setRemainingMs(Math.max(0, target - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return remainingMs;
}

function formatRemaining(ms: number, lang: "ko" | "ja" | "en") {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (lang === "ja") return `${pad(h)}時間 ${pad(m)}分 ${pad(s)}秒`;
  if (lang === "en") return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  return `${pad(h)}시간 ${pad(m)}분 ${pad(s)}초`;
}

const FEATURES: { icon: ReactNode; ko: string; ja: string; en: string }[] = [
  { icon: <Sparkles className="h-4 w-4" />, ko: "캐릭터 뽑기", ja: "キャラクターガチャ", en: "Gacha" },
  { icon: <Swords className="h-4 w-4" />, ko: "콜로세움", ja: "コロシアム", en: "Colosseum" },
  { icon: <Users className="h-4 w-4" />, ko: "길드", ja: "ギルド", en: "Guild" },
  { icon: <MessagesSquare className="h-4 w-4" />, ko: "커뮤니티", ja: "コミュニティ", en: "Community" },
  { icon: <CalendarCheck className="h-4 w-4" />, ko: "출석체크", ja: "出席チェック", en: "Attendance" },
];

export default function MaintenancePage({
  message,
  endsAt,
}: {
  message: string | null;
  endsAt: string | null;
}) {
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const locale = ko ? "ko-KR" : ja ? "ja-JP" : "en-US";
  const remainingMs = useCountdown(endsAt);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div>
          <img
            src="/logo(light).png"
            alt="Kebo"
            className="mx-auto h-16 w-auto object-contain dark:hidden"
          />
          <img
            src="/logo(dark).png"
            alt="Kebo"
            className="mx-auto h-16 w-auto object-contain hidden dark:block"
          />
        </div>

        <div className="space-y-3">
          <Wrench className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-lg font-semibold">
            {ko ? "점검 중입니다" : ja ? "メンテナンス中です" : "Under Maintenance"}
          </h1>
        </div>

        {message && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 text-left">
            <p className="text-xs font-semibold text-muted-foreground">
              {ko ? "점검 내용" : ja ? "メンテナンス内容" : "Maintenance Details"}
            </p>
            <p className="whitespace-pre-wrap text-sm text-foreground">{message}</p>
          </div>
        )}

        {endsAt && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {ko ? "예상 종료 시각" : ja ? "終了予定時刻" : "Estimated end"}:{" "}
              {new Date(endsAt).toLocaleString(locale)}
            </p>
            {remainingMs !== null && (
              <p className="text-xl font-bold text-primary tabular-nums">
                {remainingMs > 0
                  ? formatRemaining(remainingMs, lang)
                  : ko
                    ? "곧 종료됩니다..."
                    : ja
                      ? "まもなく終了します…"
                      : "Finishing up..."}
              </p>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">
            {ko
              ? "점검이 끝나면 만나볼 수 있어요"
              : ja
                ? "メンテナンス終了後にお楽しみいただけます"
                : "Waiting for you after maintenance"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {FEATURES.map((f) => (
              <div
                key={f.ko}
                className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 py-2.5 text-muted-foreground"
              >
                {f.icon}
                <span className="text-[10px]">{ko ? f.ko : ja ? f.ja : f.en}</span>
              </div>
            ))}
          </div>
        </div>

        <a
          href="https://discord.com/invite/GQvxJetjbf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          {ko
            ? "디스코드에서 소식 확인하기"
            : ja
              ? "Discordで最新情報をチェック"
              : "Check updates on Discord"}
        </a>

        <p className="text-xs text-muted-foreground">
          {ko
            ? "점검이 끝나면 자동으로 화면이 전환됩니다."
            : ja
              ? "メンテナンスが終了すると自動的に画面が切り替わります。"
              : "This page will switch automatically once maintenance ends."}
        </p>
      </div>
    </div>
  );
}
