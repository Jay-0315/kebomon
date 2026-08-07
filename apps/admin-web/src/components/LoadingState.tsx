import { Loader2 } from "lucide-react";
import { useLang } from "../context/LangContext";

export default function LoadingState() {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-2 text-[var(--fg-faint)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{t("common.loading")}</span>
    </div>
  );
}
