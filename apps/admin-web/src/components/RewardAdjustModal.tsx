import { useState } from "react";
import { api } from "../lib/api";

export type RewardSummary = {
  missionPoints: number;
  normalEggs: number;
  bigEggs: number;
  goldenEggs: number;
  enhancementStones: number;
} | null;

const FIELDS: { key: keyof NonNullable<RewardSummary>; label: string }[] = [
  { key: "missionPoints", label: "KP" },
  { key: "normalEggs", label: "일반 알" },
  { key: "bigEggs", label: "왕알" },
  { key: "goldenEggs", label: "황금 알" },
  { key: "enhancementStones", label: "강화석" },
];

export default function RewardAdjustModal({
  userId,
  userLabel,
  current,
  onClose,
  onSaved,
}: {
  userId: string;
  userLabel: string;
  current: RewardSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deltas, setDeltas] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: Record<string, number | string> = {};
    for (const f of FIELDS) {
      const raw = deltas[f.key];
      const n = raw ? Number(raw) : 0;
      if (n) body[`${f.key}Delta`] = n;
    }
    if (Object.keys(body).length === 0) {
      setError("변경할 값을 하나 이상 입력하세요.");
      return;
    }
    if (reason) body.reason = reason;

    setSaving(true);
    try {
      await api.patch(`/admin/users/${userId}/reward`, body);
      onSaved();
      onClose();
    } catch {
      setError("재화 조정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-6"
      >
        <h2 className="mb-1 text-base font-semibold">재화 조정</h2>
        <p className="mb-4 text-sm text-white/50">{userLabel}</p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs text-white/60">
                {f.label} <span className="text-white/30">(현재 {current?.[f.key] ?? 0})</span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={deltas[f.key] ?? ""}
                onChange={(e) => setDeltas((d) => ({ ...d, [f.key]: e.target.value }))}
                className="w-full rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
              />
            </div>
          ))}
        </div>

        <label className="mb-1 block text-xs text-white/60">사유 (선택)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 버그 보상, 문의 대응 등"
          className="mb-4 w-full rounded-md border border-white/15 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />

        <p className="mb-4 text-xs text-white/40">
          양수는 지급, 음수는 차감입니다. 결과값은 0 미만으로 내려가지 않습니다.
        </p>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
          >
            {saving ? "저장 중..." : "적용"}
          </button>
        </div>
      </form>
    </div>
  );
}
