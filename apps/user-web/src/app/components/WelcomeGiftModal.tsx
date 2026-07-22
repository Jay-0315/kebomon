import { Gift } from "lucide-react";
import { useLang } from "../context/LangContext";

const WELCOME_GIFT_POINTS = 2400;
const WELCOME_GIFT_NORMAL_EGGS = 10;

export default function WelcomeGiftModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold">{t("welcome_gift.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("welcome_gift.body")
            .replace("{points}", String(WELCOME_GIFT_POINTS))
            .replace("{eggs}", String(WELCOME_GIFT_NORMAL_EGGS))}
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-105"
        >
          {t("welcome_gift.confirm")}
        </button>
      </div>
    </div>
  );
}
