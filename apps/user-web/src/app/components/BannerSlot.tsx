import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type BannerRow = {
  id: string;
  title: string;
  titleJa: string | null;
  titleEn: string | null;
  body: string | null;
  bodyJa: string | null;
  bodyEn: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

const DISMISSED_KEY = "kebo-dismissed-banners";
const ROTATE_MS = 5000;

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function BannerSlot() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api
      .get<BannerRow[]>("/banners/active")
      .then(setBanners)
      .catch(() => undefined);
  }, []);

  const visible = banners.filter((b) => !dismissed.includes(b.id));

  useEffect(() => {
    if (visible.length <= 1) return;
    const timer = setInterval(() => setIdx((i) => (i + 1) % visible.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [visible.length]);

  if (visible.length === 0) return null;
  const banner = visible[idx % visible.length];

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    setIdx(0);
  }

  function handleClick() {
    if (!banner.linkUrl) return;
    if (banner.linkUrl.startsWith("/")) navigate(banner.linkUrl);
    else window.open(banner.linkUrl, "_blank", "noopener,noreferrer");
  }

  const title = (lang === "ja" ? banner.titleJa : lang === "en" ? banner.titleEn : null) ?? banner.title;
  const body = (lang === "ja" ? banner.bodyJa : lang === "en" ? banner.bodyEn : null) ?? banner.body;

  if (banner.imageUrl) {
    return (
      <div
        onClick={handleClick}
        className={`relative overflow-hidden rounded border border-border ${banner.linkUrl ? "cursor-pointer" : ""}`}
      >
        <img src={banner.imageUrl} alt={title} className="aspect-[21/6] w-full object-cover" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismiss(banner.id);
          }}
          className="absolute top-2 right-2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
        >
          <X className="w-4 h-4" />
        </button>
        {visible.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {visible.map((b, i) => (
              <div
                key={b.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === idx % visible.length ? "bg-white" : "bg-white/40"}`}
                style={{ width: i === idx % visible.length ? 24 : 6 }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-card rounded border border-border p-4 relative ${banner.linkUrl ? "cursor-pointer hover:bg-muted/50" : ""} transition-colors`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          dismiss(banner.id);
        }}
        className="absolute top-2 right-2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="pr-6 font-semibold text-primary">{title}</p>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
      {visible.length > 1 && (
        <div className="mt-3 flex gap-1.5">
          {visible.map((b, i) => (
            <div
              key={b.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === idx % visible.length ? "bg-primary" : "bg-border"}`}
              style={{ width: i === idx % visible.length ? 24 : 6 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
