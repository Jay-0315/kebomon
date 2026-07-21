import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, UserSearch } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import UserAvatar from "./UserAvatar";
import TitleBadge from "./TitleBadge";

type SearchResult = {
  id: string;
  name: string;
  profilePhoto: string | null;
  equippedTitleId: number | null;
  equippedBorderId: string | null;
};

export default function UserSearchPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const query = debouncedQ.trim();
    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }
    // 응답이 늦게 온 이전 검색어의 결과가 최신 검색어 결과를 덮어쓰지 않도록 요청마다 ID 부여
    const requestId = ++requestIdRef.current;
    api
      .get<SearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        setResults(res);
        setSearched(true);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setSearched(true);
      });
  }, [debouncedQ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <UserSearch className="h-6 w-6 text-primary" />
        <h2>{t("search.users_title")}</h2>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          className="w-full rounded-md border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
        />
      </div>

      <div className="space-y-2">
        {searched && results.length === 0 && (
          <div className="rounded border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {t("search.no_results")}
          </div>
        )}
        {results.map((u) => (
          <button
            key={u.id}
            onClick={() => navigate(`/profile/${u.id}`)}
            className="flex w-full items-center gap-3 rounded border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
          >
            <UserAvatar authorId={u.id} authorName={u.name} photoUrl={u.profilePhoto} borderId={u.equippedBorderId} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.name}</p>
              {u.equippedTitleId && (
                <div className="mt-0.5">
                  <TitleBadge titleId={u.equippedTitleId} size="xs" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
