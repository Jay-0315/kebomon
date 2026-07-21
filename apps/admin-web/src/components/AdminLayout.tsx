import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { clearAuthSession, getStoredUser } from "../lib/auth";
import { getTheme, toggleTheme } from "../lib/theme";

const navItems = [
  { to: "/dashboard", label: "대시보드" },
  { to: "/users", label: "회원 관리" },
  { to: "/community/posts", label: "게시글 관리" },
  { to: "/community/comments", label: "댓글 관리" },
  { to: "/reports", label: "신고 관리" },
  { to: "/gacha-config", label: "가챠 확률 설정" },
  { to: "/characters", label: "케보몬 관리" },
  { to: "/battles", label: "전적 모니터링" },
  { to: "/guilds", label: "길드 관리" },
  { to: "/notifications", label: "공지 발송" },
  { to: "/maintenance", label: "점검 모드" },
];

function ThemeToggleButton() {
  const [theme, setTheme] = useState(getTheme);

  return (
    <button
      onClick={() => setTheme(toggleTheme())}
      aria-label="다크/라이트 모드 전환"
      title="다크/라이트 모드 전환"
      className="rounded-md border border-[var(--border)] p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
    >
      {theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("adminSidebarCollapsed") === "1",
  );

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("adminSidebarCollapsed", next ? "1" : "0");
      return next;
    });
  }

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={`shrink-0 overflow-hidden border-r border-[var(--border)] transition-all duration-200 ${
          collapsed ? "w-0 border-r-0" : "w-56"
        }`}
      >
        <div className="w-56 p-4">
          <p className="mb-6 px-2 text-sm font-semibold text-[#b7607e]">KEBO Admin</p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-[var(--bg-active)] text-[var(--fg)]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
              className="rounded-md border border-[var(--border)] p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]"
            >
              {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <span className="text-sm text-[var(--fg-muted)]">{user?.name} ({user?.email})</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={handleLogout}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]"
            >
              로그아웃
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
