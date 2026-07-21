import { useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { api } from "../lib/api";
import CharacterEditModal, { type CharacterRow } from "../components/CharacterEditModal";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const ARENA_ARCHETYPES = ["warrior", "tank", "mage", "rogue", "nature", "meka", "cursed"];

export default function CharactersPage() {
  const [rows, setRows] = useState<CharacterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [archFilter, setArchFilter] = useState("");
  const [editing, setEditing] = useState<CharacterRow | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<CharacterRow[]>("/admin/characters");
      setRows(res);
    } catch {
      setError("목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const keyword = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (rarityFilter && c.rarity !== rarityFilter) return false;
      if (archFilter && c.arenaArchetype !== archFilter) return false;
      if (keyword && !c.korName.toLowerCase().includes(keyword) && !c.name.toLowerCase().includes(keyword) && !String(c.id).includes(keyword)) {
        return false;
      }
      return true;
    });
  }, [rows, q, rarityFilter, archFilter]);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">케보몬 관리</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">
        등급/역할/스탯 배율은 콜로세움·아레나·레이드·가챠·로그라이크에 즉시 반영됩니다.{" "}
        <span className="inline-flex items-center gap-1 text-amber-400">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          단, 로그라이크 시작 덱(카드 구성)은 캐릭터 타입의 정적 데이터를 그대로 사용해 여기서 타입을 바꿔도 덱 구성에는 반영되지 않습니다.
        </span>
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 ID 검색"
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="">전체 등급</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={archFilter}
          onChange={(e) => setArchFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="">전체 아레나 역할</option>
          {ARENA_ARCHETYPES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="self-center text-xs text-[var(--fg-faint)]">{filtered.length}종</span>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--bg-elevated)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">타입</th>
              <th className="px-3 py-2">등급</th>
              <th className="px-3 py-2">아레나 역할</th>
              <th className="px-3 py-2">로그라이크 역할</th>
              <th className="px-3 py-2">배율 (hp/atk/def/spd)</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 text-[var(--fg-faint)]">#{c.id}</td>
                <td className="px-3 py-2">{c.korName}</td>
                <td className="px-3 py-2">{c.type}</td>
                <td className="px-3 py-2">{c.rarity}</td>
                <td className="px-3 py-2">{c.arenaArchetype}</td>
                <td className="px-3 py-2">{c.rogueArchetype}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {c.hpMult} / {c.atkMult} / {c.defMult} / {c.spdMult}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                  >
                    편집
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CharacterEditModal
          character={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
