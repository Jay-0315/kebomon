import { useEffect, useMemo, useRef, useState } from "react";
import type { TdPlacementZone, TdPoint, TdSnapshot } from "../../game/tower-defense/types";
import PixelCharacter from "../PixelCharacter";

const W = 1920;
const H = 1080;
const PATH_WIDTH = 76;
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

const MONSTER_ASSET: Record<string, string> = {
  normal: "/td/monsters/slime_nature_walk.png",
  fast: "/td/monsters/slime_lightning_walk.png",
  tough: "/td/monsters/slime_dark_walk.png",
  boss: "/td/monsters/slime_fire_walk.png",
};

const RUINS_TILE_ASSET = "/td/ruins/kenney_16x16.png";

const PROJECTILE_ASSET: Record<string, string> = {
  fire: "/td/effects/cc0/fireball_projectile.png",
  water: "/td/effects/cc0/fireball_projectile.png",
  nature: "/td/effects/cc0/fireball_projectile.png",
};

const BURST_ASSET: Record<string, string> = {
  fire: "/td/effects/cc0/explosion_atlas_512.png",
  water: "/td/effects/cc0/explosion_atlas_512.png",
  nature: "/td/effects/cc0/explosion_atlas_512.png",
};

const imageCache = new Map<string, HTMLImageElement>();

function getImage(src: string) {
  if (typeof Image === "undefined") return null;
  const cached = imageCache.get(src);
  if (cached) return cached;
  const image = new Image();
  image.src = src;
  imageCache.set(src, image);
  return image;
}

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

function drawSpriteSheetCentered(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  frameSeed: number,
  fallback: () => void,
) {
  if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    const frameCount = Math.max(1, Math.floor(image.naturalWidth / image.naturalHeight));
    const frame = Math.floor(frameSeed) % frameCount;
    const frameW = image.naturalWidth / frameCount;
    ctx.drawImage(image, frame * frameW, 0, frameW, image.naturalHeight, x - size / 2, y - size / 2, size, size);
    return;
  }
  fallback();
}

function drawAtlasFrameCentered(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  size: number,
  frameSeed: number,
  fallback: () => void,
) {
  if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
    const cols = 4;
    const rows = 4;
    const frame = Math.floor(frameSeed) % (cols * rows);
    const frameW = image.naturalWidth / cols;
    const frameH = image.naturalHeight / rows;
    const sx = (frame % cols) * frameW;
    const sy = Math.floor(frame / cols) * frameH;
    ctx.drawImage(image, sx, sy, frameW, frameH, x - size / 2, y - size / 2, size, size);
    return;
  }
  fallback();
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
  bg.addColorStop(0, "#17241b");
  bg.addColorStop(0.44, "#0b110d");
  bg.addColorStop(1, "#21180f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const ruinsImage = getImage(RUINS_TILE_ASSET);
  if (ruinsImage?.complete && ruinsImage.naturalWidth > 0) {
    const pattern = ctx.createPattern(ruinsImage, "repeat");
    if (pattern) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  const outer = ctx.createLinearGradient(0, 0, W, 0);
  outer.addColorStop(0, "rgba(22, 163, 74, 0.32)");
  outer.addColorStop(0.18, "rgba(0,0,0,0)");
  outer.addColorStop(0.82, "rgba(0,0,0,0)");
  outer.addColorStop(1, "rgba(180, 83, 9, 0.26)");
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(120, 0);
  for (let y = -60; y < H + 120; y += 128) {
    for (let x = 0; x < W - 240; x += 152) {
      ctx.fillStyle = (x + y) % 256 === 0 ? "rgba(54, 63, 50, 0.62)" : "rgba(31, 39, 32, 0.68)";
      ctx.strokeStyle = "rgba(190, 166, 113, 0.22)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, 150, 126, 5);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(236, 214, 166, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 18);
      ctx.lineTo(x + 132, y + 108);
      ctx.moveTo(x + 132, y + 18);
      ctx.lineTo(x + 18, y + 108);
      ctx.stroke();

      ctx.strokeStyle = "rgba(34, 197, 94, 0.12)";
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 105);
      ctx.bezierCurveTo(x + 46, y + 88, x + 64, y + 120, x + 102, y + 94);
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
    rail.addColorStop(0, "#55604a");
    rail.addColorStop(0.52, "#202619");
    rail.addColorStop(1, "#6b5d3f");
    ctx.fillStyle = rail;
    ctx.strokeStyle = "rgba(236, 214, 166, 0.28)";
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
  ctx.lineWidth = PATH_WIDTH + 18;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = "#172d27";
  ctx.lineWidth = PATH_WIDTH;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = "rgba(111, 78, 45, 0.34)";
  ctx.lineWidth = PATH_WIDTH - 18;
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();

  ctx.strokeStyle = highlight ? "rgba(253, 224, 71, 0.48)" : "rgba(190, 166, 113, 0.18)";
  ctx.lineWidth = 3;
  ctx.setLineDash([22, 18]);
  ctx.beginPath();
  path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(245, 158, 11, 0.5)";
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
  panel.addColorStop(0, "rgba(63, 51, 36, 0.78)");
  panel.addColorStop(0.62, "rgba(27, 31, 24, 0.86)");
  panel.addColorStop(1, "rgba(17, 24, 18, 0.92)");
  ctx.fillStyle = panel;
  ctx.strokeStyle = "rgba(236, 214, 166, 0.48)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(zone.x, zone.y, zone.width, zone.height, 10);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(34, 197, 94, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(zone.x + 10, zone.y + 10, zone.width - 20, zone.height - 20, 8);
  ctx.stroke();

  ctx.strokeStyle = "rgba(236, 214, 166, 0.09)";
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
  const snapshotArrivedAtRef = useRef(Date.now());
  const [hoverSlotId, setHoverSlotId] = useState<string | null>(null);

  const ownerId = viewUserId ?? selfUserId;
  const visibleSlots = useMemo(() => snapshot?.slots.filter((slot) => !ownerId || slot.ownerUserId === ownerId) ?? [], [ownerId, snapshot]);
  const visibleTowers = useMemo(() => snapshot?.towers.filter((tower) => !ownerId || tower.ownerUserId === ownerId) ?? [], [ownerId, snapshot]);

  useEffect(() => {
    snapshotArrivedAtRef.current = Date.now();
  }, [snapshot?.tick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !snapshot) return;
    let frame = 0;

    const drawFrame = () => {
      const now = Date.now();
      const visibleMonsters = snapshot.monsters.filter((monster) => !ownerId || monster.ownerUserId === ownerId);
      const visibleProjectiles = snapshot.projectiles.filter((projectile) => !ownerId || projectile.ownerUserId === ownerId);
      const isOwnView = !!ownerId && ownerId === selfUserId;
      const hoverSlot = hoverSlotId ? visibleSlots.find((s) => s.id === hoverSlotId) : null;
      const selectedTower = selectedTowerId ? visibleTowers.find((t) => t.id === selectedTowerId) : null;
      const extrapolateSeconds = Math.min(0.32, Math.max(0, (now - snapshotArrivedAtRef.current) / 1000));

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
        const range = selectedTower?.range ?? 230;
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

      if (selectedTower) {
        const slot = visibleSlots.find((s) => s.id === selectedTower.slotId);
        if (slot) {
          ctx.fillStyle = "rgba(34, 211, 238, 0.06)";
          ctx.strokeStyle = "rgba(103, 232, 249, 0.3)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(slot.x, slot.y, selectedTower.range, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      for (const tower of visibleTowers) {
        const slot = visibleSlots.find((s) => s.id === tower.slotId);
        if (!slot) continue;
        const rarityColor = RARITY_FILL[tower.rarity] ?? "#94a3b8";
        const typeColor = TYPE_GLOW[tower.unitType] ?? "#86efac";
        ctx.save();
        ctx.shadowColor = typeColor;
        ctx.shadowBlur = tower.id === selectedTowerId ? 28 : 16;
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = tower.id === selectedTowerId ? 5 : 3;
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, tower.id === selectedTowerId ? 48 : 42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (const monster of visibleMonsters) {
        const renderPathT = Math.min(1, monster.pathT + monster.speed * extrapolateSeconds);
        const p = pointOnPath(snapshot.path, renderPathT);
        const a = pathDirection(snapshot.path, renderPathT);
        const r = monster.kind === "boss" ? 34 : monster.kind === "tough" ? 25 : 20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(a);
        ctx.shadowColor = monster.kind === "boss" ? "#ef4444" : "#84cc16";
        ctx.shadowBlur = monster.kind === "boss" ? 22 : 12;
        const monsterImage = getImage(MONSTER_ASSET[monster.kind] ?? MONSTER_ASSET.normal);
        drawSpriteSheetCentered(ctx, monsterImage, 0, 0, r * 2.5, now / 110 + monster.wave, () => {
          ctx.fillStyle = monster.kind === "boss" ? "#ef4444" : monster.kind === "fast" ? "#38bdf8" : monster.kind === "tough" ? "#a855f7" : "#84cc16";
          ctx.beginPath();
          ctx.moveTo(r + 8, 0);
          ctx.lineTo(-r, -r * 0.72);
          ctx.lineTo(-r * 0.45, 0);
          ctx.lineTo(-r, r * 0.72);
          ctx.closePath();
          ctx.fill();
        });
        ctx.restore();

        const hpPct = Math.max(0, monster.hp / monster.maxHp);
        ctx.fillStyle = "#111827";
        ctx.fillRect(p.x - 34, p.y - r - 20, 68, 7);
        ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#f59e0b" : "#ef4444";
        ctx.fillRect(p.x - 34, p.y - r - 20, 68 * hpPct, 7);
      }

      for (const projectile of visibleProjectiles) {
        const target = visibleMonsters.find((m) => m.id === projectile.toMonsterId);
        const to = target
          ? pointOnPath(snapshot.path, Math.min(1, target.pathT + target.speed * extrapolateSeconds))
          : projectile.to;
        const age = Math.max(0, now - projectile.createdAt);
        const progress = Math.max(0, Math.min(1, age / 260));
        const x = projectile.from.x + (to.x - projectile.from.x) * progress;
        const y = projectile.from.y + (to.y - projectile.from.y) * progress;
        const color = TYPE_GLOW[projectile.unitType] ?? "#6ee7b7";
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(projectile.from.x, projectile.from.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        const projectileImage = getImage(PROJECTILE_ASSET[projectile.unitType] ?? PROJECTILE_ASSET.nature);
        const angle = Math.atan2(to.y - projectile.from.y, to.x - projectile.from.x);
        const orb = ctx.createRadialGradient(x, y, 2, x, y, 18);
        orb.addColorStop(0, "rgba(255,255,255,0.95)");
        orb.addColorStop(0.32, color);
        orb.addColorStop(1, "rgba(2,6,23,0)");
        ctx.fillStyle = orb;
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(x, y);
        ctx.rotate(angle);
        drawSpriteSheetCentered(ctx, projectileImage, 0, 0, 42, now / 55 + projectile.createdAt, () => undefined);
        ctx.rotate(-angle);
        ctx.translate(-x, -y);
        if (progress > 0.62) {
          const burstImage = getImage(BURST_ASSET[projectile.unitType] ?? BURST_ASSET.nature);
          const hitAlpha = Math.max(0, 1 - (progress - 0.62) / 0.38);
          ctx.globalAlpha = hitAlpha;
          drawAtlasFrameCentered(ctx, burstImage, to.x, to.y, 92, (progress - 0.62) * 42, () => undefined);
          ctx.strokeStyle = color;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(to.x, to.y, 24 + progress * 26, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 8; i += 1) {
            const a = (Math.PI * 2 * i) / 8 + progress;
            ctx.beginPath();
            ctx.moveTo(to.x + Math.cos(a) * 14, to.y + Math.sin(a) * 14);
            ctx.lineTo(to.x + Math.cos(a) * (42 + progress * 24), to.y + Math.sin(a) * (42 + progress * 24));
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }

      const start = snapshot.path[0];
      const end = snapshot.path[snapshot.path.length - 1];
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#bbf7d0";
      ctx.fillText("SPAWN", start.x + 24, start.y - 28);
      ctx.fillText("CORE", end.x - 84, end.y + 52);

      frame = window.requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return () => window.cancelAnimationFrame(frame);
  }, [hoverSlotId, ownerId, selfUserId, snapshot, selectedTowerId, visibleSlots, visibleTowers]);

  const handlePointer = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!snapshot) return;
    const p = screenToWorld(e.currentTarget, e.clientX, e.clientY);
    const scopedSnapshot = { ...snapshot, slots: snapshot.slots.filter((slot) => !ownerId || slot.ownerUserId === ownerId) };
    const nextHoverSlotId = getSlotAtPosition(scopedSnapshot, p.x, p.y)?.id ?? null;
    setHoverSlotId((prev) => (prev === nextHoverSlotId ? prev : nextHoverSlotId));
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!snapshot) return;
    const p = screenToWorld(e.currentTarget, e.clientX, e.clientY);
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
    <div
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-md border border-emerald-500/50 bg-[#080d14] shadow-[0_0_28px_rgba(16,185,129,0.18)] ${
        fullHeight ? "h-full min-h-0" : "aspect-video max-h-[calc(100vh-220px)]"
      }`}
    >
      <div className={fullHeight ? "relative aspect-video h-full max-h-full max-w-full" : "relative aspect-video w-full max-h-full max-w-full"}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onMouseMove={handlePointer}
          onMouseLeave={() => setHoverSlotId(null)}
          onClick={handleClick}
          className="absolute inset-0 h-full w-full"
        />
        {visibleTowers.map((tower) => {
          const slot = visibleSlots.find((s) => s.id === tower.slotId);
          if (!slot) return null;
          const rarityColor = RARITY_FILL[tower.rarity] ?? "#94a3b8";
          return (
            <button
              key={tower.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectTower(tower.id);
              }}
              className="absolute z-10 flex -translate-x-1/2 -translate-y-[58%] items-center justify-center outline-none"
              style={{ left: `${(slot.x / W) * 100}%`, top: `${(slot.y / H) * 100}%` }}
            >
              <span
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
                style={{
                  border: `2px solid ${rarityColor}`,
                  background: `radial-gradient(circle, ${rarityColor}30 0%, rgba(2, 6, 23, 0.18) 58%, rgba(2, 6, 23, 0) 76%)`,
                  boxShadow: `0 0 18px ${rarityColor}99, inset 0 0 13px ${rarityColor}66`,
                }}
              >
                <PixelCharacter characterId={tower.characterId} size={48} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
