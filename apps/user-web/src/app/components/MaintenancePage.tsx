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
