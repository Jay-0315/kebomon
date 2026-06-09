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
const BORDER_PAD: Record<string, number> = { xs: 12, sm: 16, md: 20, lg: 32 };

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
  const sz = SIZE_PX[size];

  return (
    <div className="relative shrink-0" style={{ width: sz, height: sz }}>
      {inner}
      <img
        src={border.image}
        alt=""
        className="absolute pointer-events-none"
        style={{
          inset: -pad,
          width: sz + pad * 2,
          height: sz + pad * 2,
          objectFit: "contain",
        }}
      />
    </div>
  );
}
