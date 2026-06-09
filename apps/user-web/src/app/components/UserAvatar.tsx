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
const STROKE_W: Record<string, number> = { xs: 1.8, sm: 2, md: 2.5, lg: 3 };
const BORDER_PAD: Record<string, number> = { xs: 5, sm: 6, md: 7, lg: 10 };

function TierBorderSVG({ borderId, color, glow, sw, sz, uid }: {
  borderId: string; color: string; glow: string; sw: number; sz: number; uid: string;
}) {
  const cx = sz / 2, cy = sz / 2;
  const r = sz / 2 - sw / 2 - 1.5;
  const f = `drop-shadow(0 0 ${sw + 2}px ${glow})`;

  if (borderId === "s1_bronze") {
    const earR = Math.max(2.5, r * 0.28);
    const eDist = r * 0.58;
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <circle cx={cx} cy={cy + sw * 0.4} r={r * 0.9} fill="none" stroke={color} strokeWidth={sw} style={{ filter: f }} />
        <circle cx={cx - eDist * 0.62} cy={cy - eDist * 0.8} r={earR} fill="none" stroke={color} strokeWidth={sw * 0.8} />
        <circle cx={cx + eDist * 0.62} cy={cy - eDist * 0.8} r={earR} fill="none" stroke={color} strokeWidth={sw * 0.8} />
      </svg>
    );
  }

  if (borderId === "s1_silver") {
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          fill="none" stroke={color} strokeWidth={sw} style={{ filter: f }}
        />
        <polygon
          points={`${cx},${cy - r * 0.62} ${cx + r * 0.62},${cy} ${cx},${cy + r * 0.62} ${cx - r * 0.62},${cy}`}
          fill="none" stroke={color} strokeWidth={sw * 0.4} opacity={0.4}
        />
      </svg>
    );
  }

  if (borderId === "s1_gold") {
    const cr = r * 0.85;
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <circle cx={cx} cy={cy} r={cr} fill="none" stroke={color} strokeWidth={sw} style={{ filter: f }} />
        <path
          d={`M${cx - cr},${cy - cr * 0.28} Q${cx - cr * 0.45},${cy - cr * 1.22} ${cx},${cy - cr * 0.72} Q${cx + cr * 0.45},${cy - cr * 1.22} ${cx + cr},${cy - cr * 0.28}`}
          fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" style={{ filter: f }}
        />
      </svg>
    );
  }

  if (borderId === "s1_platinum") {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 - 22.5) * Math.PI / 180;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <polygon points={pts} fill="none" stroke={color} strokeWidth={sw} style={{ filter: f }} />
      </svg>
    );
  }

  if (borderId === "s1_diamond") {
    const pts = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 - 90) * Math.PI / 180;
      const rad = i % 2 === 0 ? r : r * 0.42;
      return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    }).join(" ");
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <polygon points={pts} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" style={{ filter: f }} />
      </svg>
    );
  }

  if (borderId === "s1_master") {
    const pts = Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 - 90) * Math.PI / 180;
      const rad = i % 2 === 0 ? r : r * 0.55;
      return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    }).join(" ");
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <polygon points={pts} fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" style={{ filter: f }} />
      </svg>
    );
  }

  if (borderId === "s1_challenger") {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const a = (i * 22.5 - 90) * Math.PI / 180;
      const rad = i % 2 === 0 ? r : r * 0.84;
      return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
    }).join(" ");
    return (
      <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
        <defs>
          <linearGradient id={`chal-g-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4500" />
            <stop offset="33%" stopColor="#ffd700" />
            <stop offset="66%" stopColor="#da70d6" />
            <stop offset="100%" stopColor="#ff4500" />
          </linearGradient>
        </defs>
        <polygon points={pts} fill="none" stroke={`url(#chal-g-${uid})`} strokeWidth={sw} strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 ${sw + 3}px #ff4500)` }} />
      </svg>
    );
  }

  return (
    <svg className="absolute inset-0 pointer-events-none" width={sz} height={sz}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw} style={{ filter: f }} />
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
  const uid = authorId.slice(0, 8);

  return (
    <div className="relative shrink-0" style={{ width: sz, height: sz }}>
      <TierBorderSVG
        borderId={activeBorderId!}
        color={border.color}
        glow={border.glow}
        sw={STROKE_W[size]}
        sz={sz}
        uid={uid}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        {inner}
      </div>
    </div>
  );
}
