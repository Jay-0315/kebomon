import { useEffect, useRef } from "react";
import { CHARACTERS } from "../../data/characters";
import type { TdPoint, TdSnapshot } from "../../game/tower-defense/types";

const W = 1300;
const H = 620;

const RARITY_FILL: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#22c55e",
  rare: "#38bdf8",
  epic: "#a855f7",
  legendary: "#f59e0b",
  mythic: "#f43f5e",
};

function dist(a: TdPoint, b: TdPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointOnPath(path: TdPoint[], t: number) {
  const segments = path.slice(0, -1).map((p, i) => ({ from: p, to: path[i + 1], len: dist(p, path[i + 1]) }));
  const total = segments.reduce((sum, s) => sum + s.len, 0);
  let remain = Math.max(0, Math.min(1, t)) * total;
  for (const s of segments) {
    if (remain <= s.len) {
      const r = s.len === 0 ? 0 : remain / s.len;
      return { x: s.from.x + (s.to.x - s.from.x) * r, y: s.from.y + (s.to.y - s.from.y) * r };
    }
    remain -= s.len;
  }
  return path[path.length - 1] ?? { x: 0, y: 0 };
}

interface Props {
  snapshot: TdSnapshot | null;
  selectedTowerId: string | null;
  onSelectTower: (towerId: string | null) => void;
  onSummon: (slotId: string) => void;
}

export default function GameCanvas({ snapshot, selectedTowerId, onSelectTower, onSummon }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !snapshot) return;

    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#102015");
    bg.addColorStop(1, "#07100a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#1f3b27";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#53432c";
    ctx.lineWidth = 52;
    ctx.beginPath();
    snapshot.path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = "#8b6f47";
    ctx.lineWidth = 36;
    ctx.beginPath();
    snapshot.path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = "#c6a15d";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 18]);
    ctx.beginPath();
    snapshot.path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);

    for (const slot of snapshot.slots) {
      const occupied = snapshot.towers.find((t) => t.id === slot.occupiedBy);
      ctx.fillStyle = occupied ? "#0f172a" : "#0b2215";
      ctx.strokeStyle = occupied ? RARITY_FILL[occupied.rarity] ?? "#94a3b8" : "#2f5f3a";
      ctx.lineWidth = occupied?.id === selectedTowerId ? 5 : 2;
      ctx.beginPath();
      ctx.roundRect(slot.x - 27, slot.y - 27, 54, 54, 10);
      ctx.fill();
      ctx.stroke();
      if (!occupied) {
        ctx.fillStyle = "#78d58b";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("+", slot.x, slot.y + 8);
      }
    }

    for (const tower of snapshot.towers) {
      const slot = snapshot.slots.find((s) => s.id === tower.slotId);
      if (!slot) continue;
      const char = CHARACTERS.find((c) => c.id === tower.characterId);
      ctx.fillStyle = RARITY_FILL[tower.rarity] ?? "#94a3b8";
      ctx.beginPath();
      ctx.arc(slot.x, slot.y, 21, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = char?.colors.p ?? "#ffffff";
      ctx.fillRect(slot.x - 9, slot.y - 11, 18, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(tower.characterId), slot.x, slot.y + 29);
    }

    for (const monster of snapshot.monsters) {
      const p = pointOnPath(snapshot.path, monster.pathT);
      const r = monster.kind === "boss" ? 22 : monster.kind === "tough" ? 16 : 13;
      ctx.fillStyle = monster.kind === "boss" ? "#ef4444" : monster.kind === "fast" ? "#38bdf8" : monster.kind === "tough" ? "#a855f7" : "#84cc16";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();
      const hpPct = Math.max(0, monster.hp / monster.maxHp);
      ctx.fillStyle = "#111827";
      ctx.fillRect(p.x - 22, p.y - r - 12, 44, 5);
      ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
      ctx.fillRect(p.x - 22, p.y - r - 12, 44 * hpPct, 5);
    }

    for (const projectile of snapshot.projectiles) {
      const target = snapshot.monsters.find((m) => m.id === projectile.toMonsterId);
      if (!target) continue;
      const to = pointOnPath(snapshot.path, target.pathT);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(projectile.from.x, projectile.from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.fillStyle = "#d1fae5";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ENTRY", snapshot.path[0]?.x ?? 0, (snapshot.path[0]?.y ?? 0) - 34);
    const end = snapshot.path[snapshot.path.length - 1];
    if (end) ctx.fillText("CORE", end.x - 30, end.y - 34);
  }, [snapshot, selectedTowerId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!snapshot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const slot = snapshot.slots.find((s) => Math.abs(s.x - x) < 34 && Math.abs(s.y - y) < 34);
    if (!slot) {
      onSelectTower(null);
      return;
    }
    if (slot.occupiedBy) onSelectTower(slot.occupiedBy);
    else onSummon(slot.id);
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onClick={handleClick}
      className="block w-full rounded-md border border-emerald-900/60 bg-[#07100a]"
    />
  );
}
