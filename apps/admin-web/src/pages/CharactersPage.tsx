import { useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { api } from "../lib/api";
import CharacterEditModal, { type CharacterRow } from "../components/CharacterEditModal";
import { useLang } from "../context/LangContext";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const ARENA_ARCHETYPES = ["warrior", "tank", "mage", "rogue", "nature", "meka", "cursed"];

export default function CharactersPage() {
  const { t } = useLang();
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
      setError(t("common.error_load"));
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
      <h1 className="mb-1 text-lg font-semibold">{t("characters.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">
        {t("characters.subtitle")}{" "}
        <span className="inline-flex items-center gap-1 text-amber-400">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
          {t("characters.subtitle_warning")}
        </span>
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("characters.search_placeholder")}
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("characters.rarity_all")}</option>
          {RARITIES.map((r) => (
            <option key={r} value={r} className="bg-[var(--bg-elevated)] text-[var(--fg)]">{r}</option>
          ))}
        </select>
        <select
          value={archFilter}
          onChange={(e) => setArchFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("characters.arena_all")}</option>
          {ARENA_ARCHETYPES.map((a) => (
            <option key={a} value={a} className="bg-[var(--bg-elevated)] text-[var(--fg)]">{a}</option>
          ))}
        </select>
        <span className="self-center text-xs text-[var(--fg-faint)]">
          {t("characters.count_suffix", { count: filtered.length })}
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--bg-elevated)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("characters.col_id")}</th>
              <th className="px-3 py-2">{t("characters.col_name")}</th>
              <th className="px-3 py-2">{t("characters.col_type")}</th>
              <th className="px-3 py-2">{t("characters.col_rarity")}</th>
              <th className="px-3 py-2">{t("characters.col_arena")}</th>
              <th className="px-3 py-2">{t("characters.col_rogue")}</th>
              <th className="px-3 py-2">{t("characters.col_mult")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
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
                    {t("characters.edit")}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("common.no_results")}
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
