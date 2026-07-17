import { NavLink, Outlet, useNavigate } from "react-router";
import { clearAuthSession, getStoredUser } from "../lib/auth";

const navItems = [
  { to: "/users", label: "회원 관리" },
  { to: "/community/posts", label: "게시글 관리" },
  { to: "/community/comments", label: "댓글 관리" },
  { to: "/gacha-config", label: "가챠 확률 설정" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = getStoredUser();

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-white/10 p-4">
        <p className="mb-6 px-2 text-sm font-semibold text-[#b7607e]">KEBO Admin</p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm ${
                  isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
          <span className="text-sm text-white/60">{user?.name} ({user?.email})</span>
          <button
            onClick={handleLogout}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
          >
            로그아웃
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
