import { useAppData } from "../context/AppDataContext";
import { BORDER_STYLES } from "./ColosseumPage";

interface UserAvatarProps {
  authorId: string;
  authorName: string;
  size?: "xs" | "sm" | "md" | "lg";
  photoUrl?: string | null;
  borderId?: string | null;
}

const SIZE_PX: Record<string, number> = { xs: 24, sm: 32, md: 36, lg: 56 };
const STROKE_W: Record<string, number> = { xs: 1.5, sm: 1.8, md: 2, lg: 2.5 };
const BORDER_PAD: Record<string, number> = { xs: 9, sm: 11, md: 13, lg: 18 };

const sn = (n: number) => Math.round(n);

// 픽셀 사각형 헬퍼
function PR(x: number, y: number, w: number, h: number, fill: string, op = 1) {
  return (
    <rect
      x={sn(x)} y={sn(y)}
      width={Math.max(1, sn(w))} height={Math.max(1, sn(h))}
      fill={fill} opacity={op}
      shapeRendering="crispEdges"
    />
  );
}

function TierBorderSVG({
  borderId, color, glow, sw, sz, ringR, uid,
}: {
  borderId: string; color: string; glow: string;
  sw: number; sz: number; ringR: number; uid: string;
}) {
  const cx = sz / 2, cy = sz / 2;
  const f = `drop-shadow(0 0 ${sw + 2}px ${glow})`;
  const p = Math.max(1.5, Math.round(sz / 18));
  const da = `${sn(p)} ${sn(p * 0.55)}`;

  // 공통 도트 링 (픽셀 느낌의 대시 원)
  const ring = (
    <circle cx={cx} cy={cy} r={ringR}
      fill="none" stroke={color} strokeWidth={sw}
      strokeDasharray={da} strokeLinecap="square"
      style={{ filter: f }}
    />
  );

  // ─── 브론즈: 둥근 링 + 상단 양쪽 귀 ───────────────────────────
  if (borderId === "s1_bronze") {
    const ea = 38 * Math.PI / 180;
    const er = ringR + p * 2;
    const lx = cx - Math.sin(ea) * er, ly = cy - Math.cos(ea) * er;
    const rx = cx + Math.sin(ea) * er;
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        {ring}
        {/* 왼쪽 귀 */}
        {PR(lx - p, ly - p * 2, p, p * 2, color)}
        {PR(lx,     ly - p,     p, p,      color)}
        {/* 오른쪽 귀 */}
        {PR(rx,     ly - p * 2, p, p * 2, color)}
        {PR(rx - p, ly - p,     p, p,      color)}
      </svg>
    );
  }

  // ─── 실버: 링 + 4방향 작은 다이아몬드 장식 ─────────────────────
  if (borderId === "s1_silver") {
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        {ring}
        {[0, 90, 180, 270].map(deg => {
          const a = (deg - 90) * Math.PI / 180;
          const ox = cx + (ringR + p * 2) * Math.cos(a);
          const oy = cy + (ringR + p * 2) * Math.sin(a);
          return (
            <g key={deg}>
              {PR(ox - p * 0.5, oy - p * 1.5, p, p,     color)}
              {PR(ox - p,       oy - p * 0.5, p * 2, p, color)}
              {PR(ox - p * 0.5, oy + p * 0.5, p, p,     color)}
            </g>
          );
        })}
      </svg>
    );
  }

  // ─── 골드: 링 + 상단 좌우 날개 (배트 날개) ──────────────────────
  if (borderId === "s1_gold") {
    const wa = 45 * Math.PI / 180;
    const wr = ringR + p * 1.5;
    const lx = cx - Math.sin(wa) * wr, ly = cy - Math.cos(wa) * wr;
    const rx = cx + Math.sin(wa) * wr;
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        {ring}
        {/* 왼쪽 날개 */}
        {PR(lx - p * 2.5, ly - p * 0.5, p * 2, p,      color)}
        {PR(lx - p * 2.5, ly - p * 1.5, p,      p,      color)}
        {/* 오른쪽 날개 */}
        {PR(rx + p * 0.5, ly - p * 0.5, p * 2, p,      color)}
        {PR(rx + p * 1.5, ly - p * 1.5, p,      p,      color)}
      </svg>
    );
  }

  // ─── 플레티넘: 링 + 8방향 보석 도트 ────────────────────────────
  if (borderId === "s1_platinum") {
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        {ring}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 - 90) * Math.PI / 180;
          const ox = cx + (ringR + p * 1.8) * Math.cos(a);
          const oy = cy + (ringR + p * 1.8) * Math.sin(a);
          return PR(ox - p * 0.5, oy - p * 0.5, p, p, color, undefined as unknown as number);
        })}
      </svg>
    );
  }

  // ─── 다이아몬드: 링 + 4방향 픽셀 창끝(Lance) ───────────────────
  if (borderId === "s1_diamond") {
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        {ring}
        {[0, 90, 180, 270].map(deg => {
          const a = (deg - 90) * Math.PI / 180;
          const b = ringR + p;
          const t = ringR + p * 3.5;
          const bx = cx + b * Math.cos(a), by = cy + b * Math.sin(a);
          const tx = cx + t * Math.cos(a), ty = cy + t * Math.sin(a);
          const isV = deg === 0 || deg === 180;
          return isV
            ? <rect key={deg} x={sn(bx - p * 0.5)} y={sn(Math.min(by, ty))} width={sn(p)} height={sn(Math.abs(ty - by))} fill={color} shapeRendering="crispEdges"/>
            : <rect key={deg} x={sn(Math.min(bx, tx))} y={sn(by - p * 0.5)} width={sn(Math.abs(tx - bx))} height={sn(p)} fill={color} shapeRendering="crispEdges"/>;
        })}
      </svg>
    );
  }

  // ─── 마스터: 링 + 6방향 꽃잎 도트 (눈송이) ─────────────────────
  if (borderId === "s1_master") {
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        {ring}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * 60 - 90) * Math.PI / 180;
          const or = ringR + p * 2;
          const ox = cx + or * Math.cos(a);
          const oy = cy + or * Math.sin(a);
          const ip = p * 1.5;
          return <rect key={i} x={sn(ox - ip * 0.5)} y={sn(oy - ip * 0.5)} width={sn(ip)} height={sn(ip)} fill={color} shapeRendering="crispEdges"/>;
        })}
      </svg>
    );
  }

  // ─── 챌린저: 그라데이션 링 + 8방향 픽셀 스파이크 ────────────────
  if (borderId === "s1_challenger") {
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <defs>
          <linearGradient id={`chal-g-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#ff4500"/>
            <stop offset="33%"  stopColor="#ffd700"/>
            <stop offset="66%"  stopColor="#da70d6"/>
            <stop offset="100%" stopColor="#ff4500"/>
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={ringR}
          fill="none" stroke={`url(#chal-g-${uid})`} strokeWidth={sw}
          strokeDasharray={da} strokeLinecap="square"
          style={{ filter: `drop-shadow(0 0 ${sw + 3}px #ff4500)` }}
        />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 - 90) * Math.PI / 180;
          const b = ringR + p;
          const t = ringR + p * 3;
          const bx = cx + b * Math.cos(a), by = cy + b * Math.sin(a);
          const tx = cx + t * Math.cos(a), ty = cy + t * Math.sin(a);
          const isV = Math.abs(Math.cos(a)) < 0.15;
          const isH = Math.abs(Math.sin(a)) < 0.15;
          const sc = i % 4 === 0 ? "#ff4500" : i % 2 === 0 ? "#da70d6" : "#ffd700";
          if (isV) return <rect key={i} x={sn(bx - p * 0.5)} y={sn(Math.min(by, ty))} width={sn(p)} height={sn(Math.abs(ty - by))} fill={sc} shapeRendering="crispEdges"/>;
          if (isH) return <rect key={i} x={sn(Math.min(bx, tx))} y={sn(by - p * 0.5)} width={sn(Math.abs(tx - bx))} height={sn(p)} fill={sc} shapeRendering="crispEdges"/>;
          return <rect key={i} x={sn(tx - p * 0.5)} y={sn(ty - p * 0.5)} width={sn(p)} height={sn(p)} fill={sc} shapeRendering="crispEdges"/>;
        })}
      </svg>
    );
  }

  // 폴백
  return (
    <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
      {ring}
    </svg>
  );
}

export default function UserAvatar({ authorId, authorName, size = "md", photoUrl, borderId }: UserAvatarProps) {
  const { profile, profilePhoto } = useAppData();

  const sizeClass = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-14 h-14 text-xl",
  }[size];

  const displayPhoto = authorId === profile.id ? profilePhoto : photoUrl;
  const activeBorderId = authorId === profile.id
    ? (profile as { equippedBorderId?: string | null }).equippedBorderId ?? borderId
    : borderId;
  const border = activeBorderId ? BORDER_STYLES[activeBorderId] : null;

  const inner = displayPhoto ? (
    <img src={displayPhoto} alt={authorName} className={`${sizeClass} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/60 to-accent/70 flex items-center justify-center text-white font-bold shrink-0`}>
      {authorName[0]}
    </div>
  );

  if (!border) return inner;

  const pad = BORDER_PAD[size];
  const sz = SIZE_PX[size] + pad * 2;
  const ringR = SIZE_PX[size] / 2 + 2;
  const uid = authorId.slice(0, 8);

  return (
    <div className="relative shrink-0" style={{ width: sz, height: sz }}>
      <TierBorderSVG
        borderId={activeBorderId!}
        color={border.color}
        glow={border.glow}
        sw={STROKE_W[size]}
        sz={sz}
        ringR={ringR}
        uid={uid}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        {inner}
      </div>
    </div>
  );
}
