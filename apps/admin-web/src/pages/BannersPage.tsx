import { useEffect, useState } from "react";
import { api } from "../lib/api";
import BannerFormModal, { type BannerRow } from "../components/BannerFormModal";

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<BannerRow | "new" | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<BannerRow[]>("/admin/banners");
      setBanners(res);
    } catch {
      setError("목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(banner: BannerRow) {
    if (!window.confirm(`"${banner.title}" 배너를 삭제할까요?`)) return;
    try {
      await api.delete(`/admin/banners/${banner.id}`);
      load();
    } catch {
      window.alert("삭제에 실패했습니다.");
    }
  }

  function statusOf(b: BannerRow): "inactive" | "expired" | "pending" | "running" {
    if (!b.active) return "inactive";
    const now = Date.now();
    if (b.endsAt && new Date(b.endsAt).getTime() < now) return "expired";
    if (b.startsAt && new Date(b.startsAt).getTime() > now) return "pending";
    return "running";
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">배너 관리</h1>
        <button
          onClick={() => setFormTarget("new")}
          className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e]"
        >
          새 배너
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">이미지</th>
              <th className="px-3 py-2">제목</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">기간</th>
              <th className="px-3 py-2">정렬순서</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {banners?.map((b) => (
              <tr key={b.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt="" className="h-10 w-20 rounded object-cover" />
                  ) : (
                    <span className="text-[var(--fg-faint)]">-</span>
                  )}
                </td>
                <td className="px-3 py-2">{b.title}</td>
                <td className="px-3 py-2">
                  {statusOf(b) === "inactive" && <span className="text-[var(--fg-faint)]">비활성</span>}
                  {statusOf(b) === "expired" && <span className="text-red-400">기간 만료</span>}
                  {statusOf(b) === "pending" && <span className="text-amber-400">대기중</span>}
                  {statusOf(b) === "running" && <span className="text-emerald-400">노출중</span>}
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">
                  {b.startsAt ? new Date(b.startsAt).toLocaleString() : "제한없음"} ~{" "}
                  {b.endsAt ? new Date(b.endsAt).toLocaleString() : "제한없음"}
                </td>
                <td className="px-3 py-2">{b.sortOrder}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormTarget(b)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(b)}
                      className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {banners?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  등록된 배너가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formTarget && (
        <BannerFormModal
          banner={formTarget === "new" ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
