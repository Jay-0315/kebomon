import { useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

export type CharacterRow = {
  id: number;
  name: string;
  korName: string;
  type: string;
  rarity: string;
  arenaArchetype: string;
  rogueArchetype: string;
  hpMult: number;
  atkMult: number;
  defMult: number;
  spdMult: number;
};

const CHAR_TYPES = [
  "slime", "cat", "rabbit", "ghost", "plant", "fish", "owl", "bear", "turtle", "fox",
  "wolf", "robot", "dragon", "phoenix", "unicorn", "horse", "tiger", "lion", "snake", "deer",
  "raven", "eagle", "whale", "boar", "elephant", "monkey", "beetle", "crocodile", "demon", "angel",
];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const ARENA_ARCHETYPES = ["warrior", "tank", "mage", "rogue", "nature", "meka", "cursed"];
const ROGUE_ARCHETYPES = ["energy", "attack", "defense"];

export default function CharacterEditModal({
  character,
  onClose,
  onSaved,
}: {
  character: CharacterRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState({
    type: character.type,
    rarity: character.rarity,
    arenaArchetype: character.arenaArchetype,
    rogueArchetype: character.rogueArchetype,
    hpMult: character.hpMult,
    atkMult: character.atkMult,
    defMult: character.defMult,
    spdMult: character.spdMult,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/admin/characters/${character.id}`, form);
      onSaved();
      onClose();
    } catch {
      setError(t("characterModal.error_save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
      >
        <h2 className="mb-1 text-base font-semibold">
          #{character.id} {character.korName}
        </h2>
        <p className="mb-4 text-xs text-[var(--fg-faint)]">{character.name}</p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("characterModal.field_type")}</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
            >
              {CHAR_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("characterModal.field_rarity")}</label>
            <select
              value={form.rarity}
              onChange={(e) => setForm({ ...form, rarity: e.target.value })}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r} className="bg-[var(--bg-elevated)] text-[var(--fg)]">{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("characterModal.field_arena")}</label>
            <select
              value={form.arenaArchetype}
              onChange={(e) => setForm({ ...form, arenaArchetype: e.target.value })}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
            >
              {ARENA_ARCHETYPES.map((a) => (
                <option key={a} value={a} className="bg-[var(--bg-elevated)] text-[var(--fg)]">{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">
              {t("characterModal.field_rogue")}
            </label>
            <select
              value={form.rogueArchetype}
              onChange={(e) => setForm({ ...form, rogueArchetype: e.target.value })}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
            >
              {ROGUE_ARCHETYPES.map((a) => (
                <option key={a} value={a} className="bg-[var(--bg-elevated)] text-[var(--fg)]">{a}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">
          {t("characterModal.stat_mult_label")}
        </label>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {(["hpMult", "atkMult", "defMult", "spdMult"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-[10px] text-[var(--fg-faint)]">{key.replace("Mult", "")}</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
              />
            </div>
          ))}
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
          >
            {saving ? t("gacha.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
