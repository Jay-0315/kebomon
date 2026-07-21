import { Wrench } from "lucide-react";
import { useLang } from "../context/LangContext";

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-sm space-y-3 text-center">
        <Wrench className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-lg font-semibold">
          {ko ? "점검 중입니다" : ja ? "メンテナンス中です" : "Under Maintenance"}
        </h1>
        {message && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>
        )}
        {endsAt && (
          <p className="text-sm text-muted-foreground">
            {ko ? "예상 종료 시각" : ja ? "終了予定時刻" : "Estimated end"}:{" "}
            {new Date(endsAt).toLocaleString(locale)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {ko
            ? "잠시 후 자동으로 다시 확인합니다."
            : ja
              ? "しばらくすると自動的に再確認します。"
              : "We'll automatically check again shortly."}
        </p>
      </div>
    </div>
  );
}
