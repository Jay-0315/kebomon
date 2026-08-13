import { useEffect, useRef, useState } from "react";
import { CHARACTERS } from "../../data/characters";
import type { TdPlacementZone, TdPoint, TdSnapshot } from "../../game/tower-defense/types";

const W = 1920;
const H = 1080;
const PATH_WIDTH = 118;
const SLOT_HIT_RADIUS = 48;

const RARITY_FILL: Record<string, string> = {
  common: "#94a3b8",
  uncommon: "#22c55e",
  rare: "#38bdf8",
  epic: "#a855f7",
  legendary: "#f59e0b",
  mythic: "#f43f5e",
};

const TYPE_GLOW: Record<string, string> = {
  fire: "#fb7185",
  water: "#67e8f9",
  nature: "#86efac",
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

function pathDirection(path: TdPoint[], t: number) {
  const p1 = pointOnPath(path, Math.max(0, t - 0.01));
  const p2 = pointOnPath(path, Math.min(1, t + 0.01));
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

function screenToWorld(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * W,
    y: ((clientY - rect.top) / rect.height) * H,
  };
}

function getSlotAtPosition(snapshot: TdSnapshot, x: number, y: number) {
  return snapshot.slots.find((slot) => slot.enabled && Math.hypot(slot.x - x, slot.y - y) <= SLOT_HIT_RADIUS) ?? null;
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#101722");
  bg.addColorStop(0.45, "#070b11");
  bg.addColorStop(1, "#151b25");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const outer = ctx.createLinearGradient(0, 0, W, 0);
  outer.addColorStop(0, "rgba(59, 130, 246, 0.42)");
  outer.addColorStop(0.18, "rgba(0,0,0,0)");
  outer.addColorStop(0.82, "rgba(0,0,0,0)");
  outer.addColorStop(1, "rgba(59, 130, 246, 0.32)");
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(120, 0);
  for (let y = -60; y < H + 120; y += 128) {
    for (let x = 0; x < W - 240; x += 152) {
      ctx.fillStyle = (x + y) % 256 === 0 ? "#202733" : "#171e28";
      ctx.strokeStyle = "rgba(113, 128, 150, 0.28)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, 150, 126, 5);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 18);
      ctx.lineTo(x + 132, y + 108);
      ctx.moveTo(x + 132, y + 18);
      ctx.lineTo(x + 18, y + 108);
      ctx.stroke();
    }
  }
  ctx.restore();

  for (const edge of [
    { x: 52, y: -24, w: 74, h: H + 48 },
    { x: W - 126, y: -24, w: 74, h: H + 48 },
    { x: 110, y: H - 72, w: W - 220, h: 78 },
  ]) {
    const rail = ctx.createLinearGradient(edge.x, edge.y, edge.x + edge.w, edge.y + edge.h);
    rail.addColorStop(0, "#404956");
    rail.addColorStop(0.52, "#151a22");
    rail.addColorStop(1, "#4b5563");
    ctx.fillStyle = rail;
    ctx.strokeStyle = "rgba(203, 213, 225, 0.28)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(edge.x, edge.y, edge.w, edge.h, 10);
    ctx.fill();
    ctx.stroke();
  }
}

function drawPath(ctx: CanvasRenderingContext2D, path: TdPoint[], highlight: boolean) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.62)";
  ctx.lineWidth = PATH_WIDTH + 38;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = "#111923";
  ctx.lineWidth = PATH_WIDTH;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = "rgba(94, 234, 212, 0.16)";
  ctx.lineWidth = PATH_WIDTH - 28;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = highlight ? "rgba(103, 232, 249, 0.58)" : "rgba(148, 163, 184, 0.16)";
  ctx.lineWidth = 3;
  ctx.setLineDash([22, 18]);
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(251, 191, 36, 0.46)";
  for (let t = 0.06; t < 0.96; t += 0.075) {
    const p = pointOnPath(path, t);
    const a = pathDirection(path, t);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawZone(ctx: CanvasRenderingContext2D, zone: TdPlacementZone) {
  const panel = ctx.createLinearGradient(zone.x, zone.y, zone.x, zone.y + zone.height);
  panel.addColorStop(0, "rgba(65, 38, 43, 0.72)");
  panel.addColorStop(1, "rgba(20, 24, 32, 0.84)");
  ctx.fillStyle = panel;
  ctx.strokeStyle = "rgba(226, 232, 240, 0.52)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 10);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = zone.x + 70; x < zone.x + zone.width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, zone.y + 14);
    ctx.lineTo(x, zone.y + zone.height - 14);
    ctx.stroke();
  }
  for (let y = zone.y + 62; y < zone.y + zone.height; y += 62) {
    ctx.beginPath();
    ctx.moveTo(zone.x + 14, y);
    ctx.lineTo(zone.x + zone.width - 14, y);
    ctx.stroke();
  }
}

function drawSlot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, active: boolean, invalid = false) {
  const r = active ? 42 : 35;
  ctx.save();
  ctx.shadowColor = invalid ? "#ef4444" : color;
  ctx.shadowBlur = active ? 26 : 12;
  const fill = ctx.createRadialGradient(x, y, 5, x, y, r);
  fill.addColorStop(0, invalid ? "rgba(248, 113, 113, 0.52)" : "rgba(110, 231, 183, 0.48)");
  fill.addColorStop(0.58, invalid ? "rgba(127, 29, 29, 0.28)" : "rgba(20, 184, 166, 0.24)");
  fill.addColorStop(1, "rgba(2, 6, 23, 0.9)");
  ctx.fillStyle = fill;
  ctx.strokeStyle = invalid ? "rgba(248, 113, 113, 0.86)" : color;
  ctx.lineWidth = active ? 5 : 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = invalid ? "rgba(254, 202, 202, 0.54)" : "rgba(187, 247, 208, 0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i += 1) {
    const a = (Math.PI * 2 * i) / 10;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13);
    ctx.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30);
    ctx.stroke();
  }
  ctx.restore();
}

interface Props {
  snapshot: TdSnapshot | null;
  viewUserId: string | null;
  selfUserId: string | null;
  selectedTowerId: string | null;
  fullHeight?: boolean;
  onSelectTower: (towerId: string | null) => void;
  onSummon: (slotId: string) => void;
}

export default function GameCanvas({ snapshot, viewUserId, selfUserId, selectedTowerId, fullHeight = false, onSelectTower, onSummon }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverSlotId, setHoverSlotId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !snapshot) return;

    const ownerId = viewUserId ?? selfUserId;
    const visibleSlots = snapshot.slots.filter((slot) => !ownerId || slot.ownerUserId === ownerId);
    const visibleTowers = snapshot.towers.filter((tower) => !ownerId || tower.ownerUserId === ownerId);
    const visibleMonsters = snapshot.monsters.filter((monster) => !ownerId || monster.ownerUserId === ownerId);
    const visibleProjectiles = snapshot.projectiles.filter((projectile) => !ownerId || projectile.ownerUserId === ownerId);
    const isOwnView = !!ownerId && ownerId === selfUserId;
    const hoverSlot = hoverSlotId ? visibleSlots.find((s) => s.id === hoverSlotId) : null;
    const selectedTower = selectedTowerId ? visibleTowers.find((t) => t.id === selectedTowerId) : null;

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);
    drawPath(ctx, snapshot.path, !snapshot.waveActive || !!hoverSlot);

    for (const zone of snapshot.placementZones ?? []) drawZone(ctx, zone);

    for (const slot of visibleSlots) {
      const occupied = visibleTowers.find((t) => t.id === slot.occupiedBy);
      const isHover = hoverSlotId === slot.id;
      const isSelected = occupied?.id === selectedTowerId;
      const invalid = isHover && (!isOwnView || (!!slot.occupiedBy && !isSelected));
      drawSlot(ctx, slot.x, slot.y, occupied ? RARITY_FILL[occupied.rarity] ?? "#94a3b8" : "#2dd4bf", isHover || isSelected, invalid);
      if (!occupied) {
        ctx.fillStyle = "rgba(204, 251, 241, 0.86)";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("+", slot.x, slot.y + 9);
      }
    }

    if (hoverSlot && !hoverSlot.occupiedBy) {
      const range = selectedTower?.range ?? 170;
      ctx.fillStyle = "rgba(34, 211, 238, 0.07)";
      ctx.strokeStyle = "rgba(103, 232, 249, 0.34)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hoverSlot.x, hoverSlot.y, range, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(15, 23, 42, 0.62)";
      ctx.strokeStyle = "rgba(103, 232, 249, 0.42)";
      ctx.beginPath();
      ctx.roundRect(hoverSlot.x - 34, hoverSlot.y - 45, 68, 74, 8);
      ctx.fill();
      ctx.stroke();
    }

    for (const tower of visibleTowers) {
      const slot = visibleSlots.find((s) => s.id === tower.slotId);
      if (!slot) continue;
      const char = CHARACTERS.find((c) => c.id === tower.characterId);
      const rarityColor = RARITY_FILL[tower.rarity] ?? "#94a3b8";
      const typeColor = TYPE_GLOW[tower.unitType] ?? "#86efac";
      ctx.save();
      ctx.shadowColor = typeColor;
      ctx.shadowBlur = tower.id === selectedTowerId ? 28 : 16;
      ctx.fillStyle = char?.colors.s ?? rarityColor;
      ctx.beginPath();
      ctx.roundRect(slot.x - 31, slot.y - 52, 62, 68, 12);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = char?.colors.p ?? "#ffffff";
      ctx.beginPath();
      ctx.arc(slot.x, slot.y - 23, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = char?.colors.a ?? rarityColor;
      ctx.beginPath();
      ctx.moveTo(slot.x - 27, slot.y + 4);
      ctx.lineTo(slot.x + 27, slot.y + 4);
      ctx.lineTo(slot.x + 19, slot.y + 31);
      ctx.lineTo(slot.x - 19, slot.y + 31);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rarityColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(slot.x - 8, slot.y - 28, 5, 5);
      ctx.fillRect(slot.x + 4, slot.y - 28, 5, 5);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(char?.korName ?? char?.name ?? String(tower.characterId), slot.x, slot.y + 56);
      ctx.restore();
    }

    for (const monster of visibleMonsters) {
      const p = pointOnPath(snapshot.path, monster.pathT);
      const a = pathDirection(snapshot.path, monster.pathT);
      const r = monster.kind === "boss" ? 34 : monster.kind === "tough" ? 25 : 20;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.shadowColor = monster.kind === "boss" ? "#ef4444" : "#84cc16";
      ctx.shadowBlur = monster.kind === "boss" ? 22 : 12;
      ctx.fillStyle = monster.kind === "boss" ? "#ef4444" : monster.kind === "fast" ? "#38bdf8" : monster.kind === "tough" ? "#a855f7" : "#84cc16";
      ctx.beginPath();
      ctx.moveTo(r + 8, 0);
      ctx.lineTo(-r, -r * 0.72);
      ctx.lineTo(-r * 0.45, 0);
      ctx.lineTo(-r, r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const hpPct = Math.max(0, monster.hp / monster.maxHp);
      ctx.fillStyle = "#111827";
      ctx.fillRect(p.x - 34, p.y - r - 20, 68, 7);
      ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
      ctx.fillRect(p.x - 34, p.y - r - 20, 68 * hpPct, 7);
    }

    for (const projectile of visibleProjectiles) {
      const target = visibleMonsters.find((m) => m.id === projectile.toMonsterId);
      if (!target) continue;
      const to = pointOnPath(snapshot.path, target.pathT);
      ctx.strokeStyle = "#6ee7b7";
      ctx.lineWidth = 5;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(projectile.from.x, projectile.from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const start = snapshot.path[0];
    const end = snapshot.path[snapshot.path.length - 1];
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#bbf7d0";
    ctx.fillText("SPAWN", start.x + 24, start.y - 28);
    ctx.fillText("CORE", end.x - 84, end.y + 52);
  }, [hoverSlotId, selfUserId, snapshot, selectedTowerId, viewUserId]);

  const handlePointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!snapshot) return;
    const p = screenToWorld(e.currentTarget, e.clientX, e.clientY);
    const ownerId = viewUserId ?? selfUserId;
    const scopedSnapshot = { ...snapshot, slots: snapshot.slots.filter((slot) => !ownerId || slot.ownerUserId === ownerId) };
    setHoverSlotId(getSlotAtPosition(scopedSnapshot, p.x, p.y)?.id ?? null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!snapshot) return;
    const p = screenToWorld(e.currentTarget, e.clientX, e.clientY);
    const ownerId = viewUserId ?? selfUserId;
    const scopedSnapshot = { ...snapshot, slots: snapshot.slots.filter((s) => !ownerId || s.ownerUserId === ownerId) };
    const slot = getSlotAtPosition(scopedSnapshot, p.x, p.y);
    if (!slot) {
      onSelectTower(null);
      return;
    }
    if (slot.occupiedBy) onSelectTower(slot.occupiedBy);
    else if (ownerId !== selfUserId) onSelectTower(null);
    else onSummon(slot.id);
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onMouseMove={handlePointer}
      onMouseLeave={() => setHoverSlotId(null)}
      onClick={handleClick}
      className={`block aspect-video w-full rounded-md border border-emerald-500/50 bg-[#080d14] object-contain shadow-[0_0_28px_rgba(16,185,129,0.18)] ${
        fullHeight ? "h-full max-h-full" : "max-h-[calc(100vh-220px)]"
      }`}
    />
  );
}
