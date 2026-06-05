import { useState } from "react";
import { CalendarCheck, Flame } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

function PixelPaw({ size = 22, color = "rgba(220,38,38,0.85)" }: { size?: number; color?: string }) {
  /*
   * 고양이 발바닥 도장 (viewBox 24×24)
   *  T2   T3  ← 안쪽 (높음)
   * T1     T4  ← 바깥 (낮음)
   *   [패드]
   */
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ imageRendering: "pixelated", display: "block" }}>

      {/* ── T1: 왼쪽 바깥 젤리 ── */}
      <rect x="1"  y="6"  width="2" height="1" fill={color} />
      <rect x="0"  y="7"  width="4" height="4" fill={color} />
      <rect x="1"  y="11" width="2" height="1" fill={color} />

      {/* ── T2: 왼쪽 안 젤리 ── */}
      <rect x="6"  y="4"  width="2" height="1" fill={color} />
      <rect x="5"  y="5"  width="4" height="4" fill={color} />
      <rect x="6"  y="9"  width="2" height="1" fill={color} />

      {/* ── T3: 오른쪽 안 젤리 ── */}
      <rect x="15" y="4"  width="2" height="1" fill={color} />
      <rect x="14" y="5"  width="4" height="4" fill={color} />
      <rect x="15" y="9"  width="2" height="1" fill={color} />

      {/* ── T4: 오른쪽 바깥 젤리 ── */}
      <rect x="20" y="6"  width="2" height="1" fill={color} />
      <rect x="19" y="7"  width="4" height="4" fill={color} />
      <rect x="20" y="11" width="2" height="1" fill={color} />

      {/* ── 메인 발바닥 패드 ── */}
      <rect x="6"  y="12" width="12" height="1" fill={color} />
      <rect x="5"  y="13" width="14" height="1" fill={color} />
      <rect x="4"  y="14" width="16" height="1" fill={color} />
      <rect x="3"  y="15" width="18" height="4" fill={color} />
      <rect x="4"  y="19" width="16" height="1" fill={color} />
      <rect x="5"  y="20" width="14" height="1" fill={color} />
      <rect x="7"  y="21" width="10" height="1" fill={color} />
      <rect x="9"  y="22" width="6"  height="1" fill={color} />
    </svg>
  );
}


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
        if (result.eggReward) setEggPopup(result.eggReward);
        setTimeout(() => {
          setLastPoints(null);
          setEggPopup(null);
        }, 3000);
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

      {/* 출석 보상 팝업 — 화면 중앙 고정 */}
      {(lastPoints !== null || eggPopup) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-card border border-border rounded-2xl px-8 py-6 shadow-2xl flex flex-col items-center gap-3 pointer-events-auto">
            <p className="text-lg font-extrabold text-foreground">출석 완료!</p>
            {lastPoints !== null && (
              <p className="text-3xl font-extrabold text-primary">+{lastPoints}P</p>
            )}
            {eggPopup && (
              <div className="flex items-center gap-2">
                <PixelEggMini type={eggPopup} />
                <span className="text-base font-bold text-primary">
                  {t(eggPopup === "big" ? "egg.big" : "egg.golden")} 획득!
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">3초 후 자동으로 닫힙니다</p>
          </div>
        </div>
      )}

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
                {claimed && <PixelPaw size={16} color="color-mix(in srgb, var(--primary) 80%, transparent)" />}
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
                className={`relative flex items-center justify-center rounded-lg aspect-square overflow-hidden transition-all ${
                  stamped
                    ? isWeekEnd
                      ? "bg-amber-400/20 ring-1 ring-amber-400/60"
                      : "bg-primary/15 ring-1 ring-primary/30"
                    : isToday
                    ? "border-2 border-primary/60 border-dashed bg-primary/5 animate-pulse"
                    : "bg-muted/50"
                }`}
              >
                {stamped ? (
                  <>
                    {/* 날짜 숫자 — 희미하게 배경에 남음 */}
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-semibold leading-none select-none"
                      style={{ color: isWeekEnd ? "rgba(180,83,9,0.4)" : "color-mix(in srgb, var(--primary) 35%, transparent)" }}
                    >
                      {day}
                    </span>
                    {/* 발바닥 도장 */}
                    <PixelPaw
                      size={isWeekEnd ? 48 : 40}
                      color={isWeekEnd ? "rgba(217,119,6,0.82)" : "color-mix(in srgb, var(--primary) 75%, #000 10%)"}
                    />
                  </>
                ) : (
                  <span className={`text-[11px] font-bold ${isToday ? "text-primary" : "text-muted-foreground/50"}`}>
                    {day}
                  </span>
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
