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

const DEPLOY_ZONES = [
  { x: 185, y: 38, w: 365, h: 265 },
  { x: 750, y: 38, w: 365, h: 265 },
  { x: 185, y: 335, w: 365, h: 265 },
  { x: 750, y: 335, w: 365, h: 265 },
];

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

function drawMetalFloor(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#151b23");
  bg.addColorStop(0.55, "#0d1118");
  bg.addColorStop(1, "#151920");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const space = ctx.createLinearGradient(0, 0, W, H);
  space.addColorStop(0, "rgba(45, 97, 176, 0.42)");
  space.addColorStop(0.22, "rgba(7, 14, 32, 0)");
  space.addColorStop(0.78, "rgba(7, 14, 32, 0)");
  space.addColorStop(1, "rgba(50, 120, 220, 0.32)");
  ctx.fillStyle = space;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 97) % W;
    const y = (i * 53) % H;
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }

  ctx.save();
  ctx.translate(95, 0);
  for (let y = -40; y < H + 80; y += 86) {
    for (let x = 0; x < W - 190; x += 110) {
      ctx.fillStyle = x % 220 === 0 ? "#222832" : "#1a2029";
      ctx.strokeStyle = "#303744";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, 108, 84, 4);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(91, 102, 119, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 14);
      ctx.lineTo(x + 94, y + 70);
      ctx.moveTo(x + 94, y + 14);
      ctx.lineTo(x + 14, y + 70);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const edge of [
    { x: 70, y: -20, w: 58, h: H + 40 },
    { x: W - 128, y: -20, w: 58, h: H + 40 },
    { x: 110, y: H - 48, w: W - 220, h: 58 },
  ]) {
    const rail = ctx.createLinearGradient(edge.x, edge.y, edge.x + edge.w, edge.y + edge.h);
    rail.addColorStop(0, "#323844");
    rail.addColorStop(0.5, "#151a21");
    rail.addColorStop(1, "#3d4654");
    ctx.fillStyle = rail;
    ctx.strokeStyle = "#596270";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(edge.x, edge.y, edge.w, edge.h, 8);
    ctx.fill();
    ctx.stroke();
  }
}

function drawDeployZones(ctx: CanvasRenderingContext2D) {
  for (const zone of DEPLOY_ZONES) {
    ctx.fillStyle = "rgba(82, 34, 39, 0.42)";
    ctx.strokeStyle = "rgba(176, 195, 205, 0.42)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(zone.x, zone.y, zone.w, zone.h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let x = zone.x + 72; x < zone.x + zone.w; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x, zone.y + 12);
      ctx.lineTo(x, zone.y + zone.h - 12);
      ctx.stroke();
    }
    for (let y = zone.y + 66; y < zone.y + zone.h; y += 66) {
      ctx.beginPath();
      ctx.moveTo(zone.x + 12, y);
      ctx.lineTo(zone.x + zone.w - 12, y);
      ctx.stroke();
    }
  }
}

function drawRoute(ctx: CanvasRenderingContext2D, path: TdPoint[]) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "rgba(0, 0, 0, 0.62)";
  ctx.lineWidth = 84;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = "#111821";
  ctx.lineWidth = 64;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = "rgba(239, 68, 68, 0.78)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 12]);
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = "rgba(74, 222, 128, 0.22)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawSummonCircle(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean, color: string) {
  const r = active ? 33 : 29;
  ctx.save();
  ctx.shadowColor = active ? color : "rgba(34, 197, 94, 0.38)";
  ctx.shadowBlur = active ? 20 : 10;
  const base = ctx.createRadialGradient(x, y, 5, x, y, r);
  base.addColorStop(0, "rgba(97, 255, 157, 0.42)");
  base.addColorStop(0.52, "rgba(22, 163, 74, 0.24)");
  base.addColorStop(1, "rgba(3, 20, 12, 0.86)");
  ctx.fillStyle = base;
  ctx.strokeStyle = active ? color : "rgba(74, 222, 128, 0.75)";
  ctx.lineWidth = active ? 4 : 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(134, 239, 172, 0.52)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9);
    ctx.lineTo(x + Math.cos(a) * 25, y + Math.sin(a) * 25);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
    drawMetalFloor(ctx);
    drawDeployZones(ctx);
    drawRoute(ctx, snapshot.path);

    for (const slot of snapshot.slots) {
      const occupied = snapshot.towers.find((t) => t.id === slot.occupiedBy);
      drawSummonCircle(ctx, slot.x, slot.y, occupied?.id === selectedTowerId, occupied ? RARITY_FILL[occupied.rarity] ?? "#94a3b8" : "#22c55e");
      if (!occupied) {
        ctx.fillStyle = "rgba(187, 247, 208, 0.9)";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("+", slot.x, slot.y + 7);
      }
    }

    for (const tower of snapshot.towers) {
      const slot = snapshot.slots.find((s) => s.id === tower.slotId);
      if (!slot) continue;
      const char = CHARACTERS.find((c) => c.id === tower.characterId);
      const rarityColor = RARITY_FILL[tower.rarity] ?? "#94a3b8";
      ctx.shadowColor = rarityColor;
      ctx.shadowBlur = 12;
      ctx.fillStyle = rarityColor;
      ctx.beginPath();
      ctx.roundRect(slot.x - 15, slot.y - 24, 30, 34, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(slot.x - 10, slot.y - 18, 20, 12);
      ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
      ctx.beginPath();
      ctx.moveTo(slot.x - 22, slot.y + 10);
      ctx.lineTo(slot.x + 22, slot.y + 10);
      ctx.lineTo(slot.x + 12, slot.y + 25);
      ctx.lineTo(slot.x - 12, slot.y + 25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = char?.colors.p ?? "#ffffff";
      ctx.fillRect(slot.x - 6, slot.y - 15, 12, 8);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(tower.characterId), slot.x, slot.y + 39);
    }

    for (const monster of snapshot.monsters) {
      const p = pointOnPath(snapshot.path, monster.pathT);
      const r = monster.kind === "boss" ? 22 : monster.kind === "tough" ? 16 : 13;
      ctx.shadowColor = monster.kind === "boss" ? "#ef4444" : "#84cc16";
      ctx.shadowBlur = monster.kind === "boss" ? 18 : 10;
      ctx.fillStyle = monster.kind === "boss" ? "#ef4444" : monster.kind === "fast" ? "#38bdf8" : monster.kind === "tough" ? "#a855f7" : "#84cc16";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r, p.y + r);
      ctx.lineTo(p.x - r, p.y + r);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
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
      ctx.strokeStyle = "#6ee7b7";
      ctx.lineWidth = 4;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(projectile.from.x, projectile.from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "#bbf7d0";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SPAWN", (snapshot.path[0]?.x ?? 0) + 16, (snapshot.path[0]?.y ?? 0) - 18);
    const end = snapshot.path[snapshot.path.length - 1];
    if (end) ctx.fillText("CORE", end.x + 16, end.y + 24);
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
      className="block w-full rounded-md border border-emerald-500/50 bg-[#080d14] shadow-[0_0_28px_rgba(16,185,129,0.18)]"
    />
  );
}
