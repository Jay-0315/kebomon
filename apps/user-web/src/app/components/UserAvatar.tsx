import { useAppData } from "../context/AppDataContext";
import { BORDER_STYLES, getBorderLayout } from "./ColosseumPage";

interface UserAvatarProps {
  authorId: string;
  authorName: string;
  size?: "xs" | "sm" | "md" | "lg";
  photoUrl?: string | null;
  borderId?: string | null;
}

const SIZE_PX: Record<string, number> = { xs: 24, sm: 32, md: 36, lg: 56 };

export default function UserAvatar({ authorId, authorName, size = "md", photoUrl, borderId }: UserAvatarProps) {
  const { profile, profilePhoto } = useAppData();

  const textSizeClass = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-xl",
  }[size];

  const displayPhoto = authorId === profile.id ? profilePhoto : photoUrl;
  const activeBorderId = authorId === profile.id
    ? (profile as { equippedBorderId?: string | null }).equippedBorderId ?? borderId
    : borderId;
  const border = activeBorderId ? BORDER_STYLES[activeBorderId] : null;

  // 컨테이너는 항상 SIZE_PX 고정 — 프레임 PNG 캔버스 비율이 제각각이라 프레임 크기에 맞춰
  // 늘리면(예전 방식) 댓글/채팅 등 좁은 레이아웃에서 아바타 크기가 테두리별로 들쭉날쭉해진다.
  const containerSize = SIZE_PX[size];
  const layout = border ? getBorderLayout(border.image, containerSize) : null;
  const photoSize = layout ? layout.photoSize : containerSize;

  const inner = displayPhoto ? (
    <img
      src={displayPhoto}
      alt={authorName}
      className="rounded-full object-cover shrink-0"
      style={{ width: photoSize, height: photoSize }}
    />
  ) : (
    <div
      className={`${textSizeClass} rounded-full bg-gradient-to-br from-primary/60 to-accent/70 flex items-center justify-center text-white font-bold shrink-0`}
      style={{ width: photoSize, height: photoSize }}
    >
      {authorName[0]}
    </div>
  );

  if (!border || !layout) return inner;

  return (
    <div className="relative shrink-0" style={{ width: containerSize, height: containerSize }}>
      <div className="absolute" style={{ top: layout.photoTop, left: layout.photoLeft }}>
        {inner}
      </div>
      <img
        src={border.image}
        alt=""
        className="absolute pointer-events-none"
        style={{ width: layout.frameW, height: layout.frameH, left: layout.frameLeft, top: layout.frameTop }}
      />
    </div>
  );
}
