import { useEffect, useState } from "react";
import { api } from "../lib/api";

type MaintenanceConfig = {
  enabled: boolean;
  message: string | null;
  endsAt: string | null;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MaintenancePage() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MaintenanceConfig>("/admin/maintenance");
      setEnabled(res.enabled);
      setMessage(res.message ?? "");
      setEndsAt(toDatetimeLocal(res.endsAt));
    } catch {
      setError("설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { enabled };
      if (enabled) {
        if (message) body.message = message;
        if (endsAt) body.endsAt = new Date(endsAt).toISOString();
      }
      const res = await api.patch<MaintenanceConfig>("/admin/maintenance", body);
      setEnabled(res.enabled);
      setMessage(res.message ?? "");
      setEndsAt(toDatetimeLocal(res.endsAt));
      setSavedAt(Date.now());
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-[var(--fg-faint)]">불러오는 중...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-lg font-semibold">점검 모드</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">
        활성화하면 관리자페이지를 제외한 모든 요청이 즉시 차단되고, 유저에게는 점검 화면이 표시됩니다.
      </p>

      {enabled && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          현재 점검 중입니다.
        </div>
      )}

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        점검 모드 활성화
      </label>

      <label className="mb-1 block text-xs text-[var(--fg-muted)]">안내 메시지 (선택)</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="예: 서버 안정화 작업을 진행 중입니다."
        className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
      />

      <label className="mb-1 block text-xs text-[var(--fg-muted)]">종료 예정 시각 (선택)</label>
      <input
        type="datetime-local"
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
        className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
      />

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {savedAt && !error && <p className="mb-4 text-sm text-emerald-400">저장되었습니다.</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-[#b7607e] px-4 py-2 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
