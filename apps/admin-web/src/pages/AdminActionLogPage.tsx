import { useEffect, useState } from "react";
import { api, downloadFile } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { translate, type Lang, type TranslationKey } from "../lib/i18n";

type ActionLogRow = {
  id: string;
  actorId: string;
  actorName: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  detail: string | null;
  createdAt: string;
};

type ActionLogResponse = {
  logs: ActionLogRow[];
  total: number;
  page: number;
  totalPages: number;
};

const ACTION_LABEL_KEY: Record<string, TranslationKey> = {
  BANNER_CREATE: "actionLog.action_BANNER_CREATE",
  BANNER_UPDATE: "actionLog.action_BANNER_UPDATE",
  BANNER_DELETE: "actionLog.action_BANNER_DELETE",
  CHARACTER_BALANCE_UPDATE: "actionLog.action_CHARACTER_BALANCE_UPDATE",
  POST_DELETE: "actionLog.action_POST_DELETE",
  COMMENT_DELETE: "actionLog.action_COMMENT_DELETE",
  GACHA_CONFIG_UPDATE: "actionLog.action_GACHA_CONFIG_UPDATE",
  GUILD_DISBAND: "actionLog.action_GUILD_DISBAND",
  INQUIRY_REPLY: "actionLog.action_INQUIRY_REPLY",
  MAINTENANCE_ENABLE: "actionLog.action_MAINTENANCE_ENABLE",
  MAINTENANCE_DISABLE: "actionLog.action_MAINTENANCE_DISABLE",
  NOTIFICATION_BROADCAST: "actionLog.action_NOTIFICATION_BROADCAST",
  REPORT_RESOLVE: "actionLog.action_REPORT_RESOLVE",
  SEASON_FORCE_RESET: "actionLog.action_SEASON_FORCE_RESET",
  USER_ROLE_CHANGE: "actionLog.action_USER_ROLE_CHANGE",
  USER_SUSPEND: "actionLog.action_USER_SUSPEND",
  USER_UNSUSPEND: "actionLog.action_USER_UNSUSPEND",
  USER_REWARD_ADJUST: "actionLog.action_USER_REWARD_ADJUST",
  USER_REWARD_BULK_ADJUST: "actionLog.action_USER_REWARD_BULK_ADJUST",
  USER_TITLE_GRANT: "actionLog.action_USER_TITLE_GRANT",
  USER_TITLE_REVOKE: "actionLog.action_USER_TITLE_REVOKE",
};

const TARGET_TYPE_KEY: Record<string, TranslationKey> = {
  USER: "actionLog.target_USER",
  POST: "actionLog.target_POST",
  COMMENT: "actionLog.target_COMMENT",
  GUILD: "actionLog.target_GUILD",
  BANNER: "actionLog.target_BANNER",
  CHARACTER: "actionLog.target_CHARACTER",
  INQUIRY: "actionLog.target_INQUIRY",
  REPORT: "actionLog.target_REPORT",
};

const ROLE_KEY: Record<string, TranslationKey> = {
  ADMIN: "actionLog.role_ADMIN",
  USER: "actionLog.role_USER",
};

const STATUS_KEY: Record<string, TranslationKey> = {
  RESOLVED: "reports.status_resolved",
  DISMISSED: "reports.status_dismissed",
};

/** "role -> ADMIN" / "status -> DISMISSED" / "season 2"처럼 detail에 기계적으로 박힌 문자열을
 *  사람이 읽기 좋은 문장으로 바꾼다 — 매칭되는 패턴이 없으면 저장된 텍스트를 그대로 보여준다. */
function formatDetail(detail: string | null, lang: Lang): string {
  if (!detail) return "-";
  const roleMatch = detail.match(/^role -> (\w+)$/);
  if (roleMatch) {
    const roleKey = ROLE_KEY[roleMatch[1]];
    return translate(lang, "actionLog.detail_role_change", { role: roleKey ? translate(lang, roleKey) : roleMatch[1] });
  }
  const statusMatch = detail.match(/^status -> (\w+)$/);
  if (statusMatch) {
    const statusKey = STATUS_KEY[statusMatch[1]];
    return translate(lang, "actionLog.detail_status_change", {
      status: statusKey ? translate(lang, statusKey) : statusMatch[1],
    });
  }
  const seasonMatch = detail.match(/^season (\d+)$/);
  if (seasonMatch) {
    return translate(lang, "actionLog.detail_season", { id: seasonMatch[1] });
  }
  return detail;
}

export default function AdminActionLogPage() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ActionLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  async function load(p: number) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actorId) params.set("actorId", actorId);
      params.set("page", String(p));
      const res = await api.get<ActionLogResponse>(`/admin/action-log?${params.toString()}`);
      setData(res);
    } catch {
      setError(t("common.error_load"));
    }
  }

  useEffect(() => {
    setPage(1);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId]);

  function handlePageChange(p: number) {
    setPage(p);
    void load(p);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (actorId) params.set("actorId", actorId);
      await downloadFile(`/admin/action-log/export?${params.toString()}`, "action-log.csv");
    } catch {
      showToast(t("actionLog.error_export"), "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("actionLog.title")}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          placeholder={t("actionLog.filter_placeholder")}
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
        >
          {exporting ? t("common.loading") : t("actionLog.export_csv")}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("actionLog.col_actor")}</th>
              <th className="px-3 py-2">{t("actionLog.col_action")}</th>
              <th className="px-3 py-2">{t("actionLog.col_target")}</th>
              <th className="px-3 py-2">{t("actionLog.col_detail")}</th>
              <th className="px-3 py-2">{t("common.date")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((l) => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap" title={l.actorId}>
                  {l.actorName ?? <span className="font-mono text-xs text-[var(--fg-faint)]">{l.actorId}</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {ACTION_LABEL_KEY[l.action] ? t(ACTION_LABEL_KEY[l.action]) : l.action}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]" title={l.targetId ?? undefined}>
                  {l.targetType ? (
                    <>
                      {TARGET_TYPE_KEY[l.targetType] ? t(TARGET_TYPE_KEY[l.targetType]) : l.targetType}
                      {l.targetName && ` · ${l.targetName}`}
                    </>
                  ) : (
                    t("actionLog.no_target")
                  )}
                </td>
                <td className="px-3 py-2 max-w-sm truncate text-[var(--fg-muted)]">{formatDetail(l.detail, lang)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data?.logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("common.no_results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            {t("common.prev")}
          </button>
          <span className="text-[var(--fg-muted)]">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            {t("common.next")}
          </button>
        </div>
      )}
    </div>
  );
}
