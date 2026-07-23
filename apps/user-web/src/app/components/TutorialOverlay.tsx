import { useState, type ReactNode } from "react";
import { CalendarCheck, Sparkles, Swords, Newspaper, ChevronRight } from "lucide-react";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

const SLIDES: { icon: ReactNode; titleKey: TranslationKey; bodyKey: TranslationKey }[] = [
  {
    icon: <CalendarCheck className="h-9 w-9 text-primary" />,
    titleKey: "tutorial.slide1_title",
    bodyKey: "tutorial.slide1_body",
  },
  {
    icon: <Sparkles className="h-9 w-9 text-primary" />,
    titleKey: "tutorial.slide2_title",
    bodyKey: "tutorial.slide2_body",
  },
  {
    icon: <Swords className="h-9 w-9 text-primary" />,
    titleKey: "tutorial.slide3_title",
    bodyKey: "tutorial.slide3_body",
  },
  {
    icon: <Newspaper className="h-9 w-9 text-primary" />,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("tutorial.skip")}
        </button>

        <div className="mb-6 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i <= idx ? "bg-primary" : "bg-border"}`}
              style={{ width: i === idx ? 24 : 6 }}
            />
          ))}
        </div>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {slide.icon}
        </div>
        <h2 className="text-lg font-bold">{t(slide.titleKey)}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(slide.bodyKey)}</p>

        <button
          onClick={next}
          className="mt-6 flex w-full items-center justify-center gap-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-105"
        >
          {isLast ? t("tutorial.start") : t("tutorial.next")}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
