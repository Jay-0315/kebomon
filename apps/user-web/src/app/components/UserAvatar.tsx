import { useAppData } from "../context/AppDataContext";
import { BORDER_STYLES } from "./ColosseumPage";

interface UserAvatarProps {
  authorId: string;
  authorName: string;
  size?: "xs" | "sm" | "md" | "lg";
  photoUrl?: string | null;
  borderId?: string | null;
}

const BORDER_PX: Record<string, number> = { xs: 2, sm: 2, md: 2, lg: 3 };
const BORDER_OFFSET: Record<string, number> = { xs: 2, sm: 2, md: 3, lg: 4 };
const SIZE_PX: Record<string, number> = { xs: 24, sm: 32, md: 36, lg: 56 };

export default function UserAvatar({ authorId, authorName, size = "md", photoUrl, borderId }: UserAvatarProps) {
  const { profile, profilePhoto } = useAppData();

  const sizeClass = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-14 h-14 text-xl",
  }[size];

  const displayPhoto = authorId === profile.id ? profilePhoto : photoUrl;
  const activeBorderId = authorId === profile.id ? (profile as { equippedBorderId?: string | null }).equippedBorderId ?? borderId : borderId;
  const border = activeBorderId ? BORDER_STYLES[activeBorderId] : null;

  const inner = displayPhoto ? (
    <img
      src={displayPhoto}
      alt={authorName}
      className={`${sizeClass} rounded-full object-cover shrink-0`}
      style={border ? { boxShadow: `0 0 0 ${BORDER_PX[size]}px ${border.color}, 0 0 ${BORDER_OFFSET[size]*2}px ${border.glow}` } : undefined}
    />
  ) : (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/60 to-accent/70 flex items-center justify-center text-white font-bold shrink-0`}
      style={border ? { boxShadow: `0 0 0 ${BORDER_PX[size]}px ${border.color}, 0 0 ${BORDER_OFFSET[size]*2}px ${border.glow}` } : undefined}
    >
      {authorName[0]}
    </div>
  );

  if (border?.animated) {
    const sz = SIZE_PX[size] + BORDER_OFFSET[size] * 2;
    return (
      <div className="relative shrink-0" style={{ width: sz, height: sz }}>
        <svg className="absolute inset-0" width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ pointerEvents: "none" }}>
          <defs>
            <linearGradient id={`border-grad-${authorId.slice(0,6)}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4500"/>
              <stop offset="33%" stopColor="#ffd700"/>
              <stop offset="66%" stopColor="#da70d6"/>
              <stop offset="100%" stopColor="#ff4500"/>
            </linearGradient>
          </defs>
          <circle cx={sz/2} cy={sz/2} r={sz/2 - 1} fill="none"
            stroke={`url(#border-grad-${authorId.slice(0,6)})`}
            strokeWidth={BORDER_PX[size]}
            style={{ filter: `drop-shadow(0 0 4px ${border.glow})` }}
          />
        </svg>
        <div className="absolute" style={{ inset: BORDER_OFFSET[size] }}>
          {inner}
        </div>
      </div>
    );
  }

  return inner;
}
