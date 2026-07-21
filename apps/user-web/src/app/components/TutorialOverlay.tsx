import { useState, type ReactNode } from "react";
import { CalendarCheck, Sparkles, Swords, Newspaper, ChevronRight } from "lucide-react";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

const SLIDES: { icon: ReactNode; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  {
    icon: <CalendarCheck className="h-9 w-9 text-amber-400" />,
    titleKey: "tutorial.slide1_title",
    bodyKey: "tutorial.slide1_body",
  },
  {
    icon: <Sparkles className="h-9 w-9 text-amber-400" />,
    titleKey: "tutorial.slide2_title",
    bodyKey: "tutorial.slide2_body",
  },
  {
    icon: <Swords className="h-9 w-9 text-amber-400" />,
    titleKey: "tutorial.slide3_title",
    bodyKey: "tutorial.slide3_body",
  },
  {
    icon: <Newspaper className="h-9 w-9 text-amber-400" />,
    titleKey: "tutorial.slide4_title",
    bodyKey: "tutorial.slide4_body",
  },
];

export default function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const [idx, setIdx] = useState(0);
  const isLast = idx === SLIDES.length - 1;
  const slide = SLIDES[idx];

  const next = () => {
    if (isLast) onClose();
    else setIdx((i) => i + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/98 px-6">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/20 hover:text-white"
      >
        {t("tutorial.skip")}
      </button>

      <div className="mb-8 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === idx ? 24 : 6,
              background: i <= idx ? "#f59e0b" : "#ffffff25",
            }}
          />
        ))}
      </div>

      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
          {slide.icon}
        </div>
        <h2 className="text-lg font-bold text-white">{t(slide.titleKey)}</h2>
        <p className="text-sm leading-relaxed text-white/70">{t(slide.bodyKey)}</p>
      </div>

      <button
        onClick={next}
        className="mt-10 flex w-64 items-center justify-center gap-1 rounded-2xl py-3 text-sm font-bold text-white"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          boxShadow: "0 4px 24px #7c3aed40",
        }}
      >
        {isLast ? t("tutorial.start") : t("tutorial.next")}
        {!isLast && <ChevronRight className="h-4 w-4" />}
      </button>
    </div>
  );
}
