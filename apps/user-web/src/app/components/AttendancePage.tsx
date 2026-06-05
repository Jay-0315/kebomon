import { useState } from "react";
import { CalendarCheck, Flame, CheckCircle2 } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function PixelEggMini({ type }: { type: "big" | "golden" }) {
  const C = type === "big"
    ? { body: "#7dd3fc", hi: "#dbeafe", lo: "#1d4ed8" }
    : { body: "#fbbf24", hi: "#fef9c3", lo: "#b45309" };
  return (
    <svg width={20} height={24} viewBox="0 0 16 20" style={{ imageRendering: "pixelated" }}>
      <rect x="5" y="0"  width="6"  height="2" fill={C.body} />
      <rect x="3" y="2"  width="10" height="2" fill={C.body} />
      <rect x="2" y="4"  width="12" height="2" fill={C.body} />
      <rect x="1" y="6"  width="14" height="2" fill={C.body} />
      <rect x="0" y="8"  width="16" height="4" fill={C.body} />
      <rect x="1" y="12" width="14" height="2" fill={C.body} />
      <rect x="2" y="14" width="12" height="2" fill={C.body} />
      <rect x="4" y="16" width="8"  height="2" fill={C.body} />
      <rect x="6" y="18" width="4"  height="2" fill={C.body} />
      <rect x="4" y="2"  width="3"  height="2" fill={C.hi} />
      <rect x="3" y="4"  width="2"  height="2" fill={C.hi} />
      <rect x="4" y="14" width="4"  height="2" fill={C.lo} />
    </svg>
  );
}

const WEEK_REWARDS: { week: number; day: number; type: "big" | "golden"; eggKey: TranslationKey }[] = [
  { week: 1, day: 7,  type: "big",    eggKey: "egg.big" },
  { week: 2, day: 14, type: "big",    eggKey: "egg.big" },
  { week: 3, day: 21, type: "golden", eggKey: "egg.golden" },
  { week: 4, day: 28, type: "golden", eggKey: "egg.golden" },
];

export default function AttendancePage() {
  const { rewardSummary, claimAttendance } = useAppData();
  const { t, lang } = useLang();
  const { attendanceDays, streakDays, attendanceClaimedToday, monthDays, monthWeekRewards } = rewardSummary;

  const [claiming, setClaiming] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [eggPopup, setEggPopup] = useState<"big" | "golden" | null>(null);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const totalDays = daysInMonth(year, month);
  const monthLabel = lang === "ja" ? `${year}年${month}月` : `${year}년 ${month}월`;

  const handleClaim = async () => {
    if (claiming || attendanceClaimedToday) return;
    setClaiming(true);
    setLastPoints(null);
    setEggPopup(null);
    try {
      const result = await claimAttendance();
      if (!result.alreadyClaimed) {
        setLastPoints(result.points);
        if (result.eggReward) {
          setEggPopup(result.eggReward);
          setTimeout(() => setEggPopup(null), 3000);
        }
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("nav.attendance")}</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
      </div>

      {/* 스탯 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <CalendarCheck className="w-4 h-4 text-primary" />, label: t("attendance.this_month"), value: monthDays, unit: t("kabemon.days") },
          { icon: <Flame className="w-4 h-4 text-orange-400" />, label: t("kabemon.streak"), value: streakDays, unit: t("kabemon.days") },
          { icon: <CalendarCheck className="w-4 h-4 text-muted-foreground" />, label: t("attendance.total"), value: attendanceDays, unit: t("kabemon.days") },
        ].map(({ icon, label, value, unit }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="flex justify-center mb-1">{icon}</div>
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-xl font-extrabold">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
          </div>
        ))}
      </div>

      {/* 출석 버튼 */}
      <div className="relative">
        {eggPopup && (
          <div className="absolute inset-x-0 -top-12 flex justify-center pointer-events-none z-10">
            <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-lg animate-bounce">
              <PixelEggMini type={eggPopup} />
              <span className="text-sm font-extrabold text-primary">
                {t(eggPopup === "big" ? "egg.big" : "egg.golden")}
              </span>
            </div>
          </div>
        )}
        {lastPoints !== null && !eggPopup && (
          <div className="absolute inset-x-0 -top-10 flex justify-center pointer-events-none">
            <span className="bg-primary text-primary-foreground text-sm font-extrabold px-4 py-1.5 rounded-full shadow-lg animate-bounce">
              +{lastPoints}P
            </span>
          </div>
        )}
        <button
          onClick={handleClaim}
          disabled={claiming || attendanceClaimedToday}
          className={`w-full py-3.5 rounded-xl text-base font-extrabold tracking-wide transition-all ${
            attendanceClaimedToday
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:brightness-105 active:scale-[0.98] shadow-md"
          }`}
        >
          {claiming
            ? t("attendance.btn_processing")
            : attendanceClaimedToday
            ? `✓ ${t("attendance.btn_done")}`
            : t("attendance.btn_check")}
        </button>
      </div>

      {/* 주차별 알 보상 */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">{t("attendance.week_rewards")}</p>
        <div className="grid grid-cols-4 gap-2">
          {WEEK_REWARDS.map(({ week, day, type, eggKey }) => {
            const claimed = !!(monthWeekRewards & (1 << (week - 1)));
            return (
              <div
                key={week}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                  claimed
                    ? type === "golden" ? "border-amber-400/60 bg-amber-500/10" : "border-sky-400/60 bg-sky-500/10"
                    : "border-border bg-muted/40"
                }`}
              >
                <div className={claimed ? "opacity-100" : "opacity-40"}>
                  <PixelEggMini type={type} />
                </div>
                <p className="text-[10px] font-semibold text-center leading-tight text-muted-foreground">
                  {day}{t("attendance.week_label")} {t(eggKey)}
                </p>
                {claimed && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 출석 그리드 — 7칸씩 */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 text-center">
          {monthLabel} {t("attendance.stamp_title")} — {monthDays} / {totalDays}
        </p>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: totalDays }, (_, i) => {
            const day = i + 1;
            const stamped = day <= monthDays;
            const isToday = day === monthDays + 1 && !attendanceClaimedToday;
            const isWeekEnd = day % 7 === 0 && day <= 28;
            const weekIdx = Math.floor((day - 1) / 7);
            const weekRewardClaimed = !!(monthWeekRewards & (1 << weekIdx));

            return (
              <div
                key={day}
                className={`relative flex flex-col items-center justify-center rounded-lg aspect-square text-[11px] font-bold transition-all ${
                  stamped
                    ? isWeekEnd
                      ? weekRewardClaimed
                        ? "bg-primary/80 text-primary-foreground ring-2 ring-primary/40"
                        : "bg-primary/80 text-primary-foreground"
                      : "bg-primary/70 text-primary-foreground"
                    : isToday
                    ? "border-2 border-primary/60 border-dashed bg-primary/5 text-primary animate-pulse"
                    : "bg-muted/60 text-muted-foreground/50"
                }`}
              >
                {stamped ? (
                  isWeekEnd ? (
                    <span className="text-base leading-none">✓</span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )
                ) : (
                  <span>{day}</span>
                )}
                {isWeekEnd && stamped && weekRewardClaimed && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-400 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    🥚
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground text-center">
          {t("attendance.stamp_desc")}
        </p>
      </div>
    </div>
  );
}
