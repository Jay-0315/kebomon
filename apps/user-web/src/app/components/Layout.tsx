import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Home, User, Settings, Globe, Menu, X, Gamepad2, LogOut, Newspaper, Radio, PanelLeftClose, PanelLeft, Swords, CalendarCheck } from "lucide-react";
import Footer from "./Footer";
import { useState, useEffect } from "react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { clearAuthSession } from "../lib/auth";
import TitleBadge from "./TitleBadge";
import NotificationBell from "./NotificationBell";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("sidebarCollapsed") === "1",
  );
  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  };
  const { profile, rewardSummary, profilePhoto } = useAppData();
  const { t } = useLang();

  const navItems = [
    { path: "/", icon: Home, label: t("nav.home") },
    { path: "/community", icon: Newspaper, label: t("nav.community") },
    { path: "/kabemon", icon: Gamepad2, label: t("nav.kabemon") },
    { path: "/attendance", icon: CalendarCheck, label: t("nav.attendance") },
    { path: "/live", icon: Radio, label: t("nav.live") },
    { path: "/raid", icon: Swords, label: t("nav.raid") },
  ];

  const settingsItems = [
    { path: "/mypage", icon: User, label: t("nav.mypage") },
    { path: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
    window.location.reload();
  };

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground px-3 mb-2">
          {t("nav.menu")}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 space-y-1">
        <p className="text-xs text-muted-foreground px-3 mb-2">
          {t("nav.settings_section")}
        </p>
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNav}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop sidebar expand button (shown when collapsed) ── */}
      {isSidebarCollapsed && (
        <button
          onClick={toggleSidebarCollapsed}
          title="사이드바 펼치기"
          className="hidden lg:flex fixed top-4 left-4 z-50 items-center justify-center w-10 h-10 rounded-lg bg-sidebar border border-sidebar-border shadow-md text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden lg:flex lg:flex-col w-56 bg-sidebar border-r border-sidebar-border fixed h-screen z-30 transition-transform duration-200 ${
          isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between gap-2">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0"
          >
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-foreground">Kebo</h1>
          </Link>
          <button
            onClick={toggleSidebarCollapsed}
            title="사이드바 접기"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Bell */}
        <div className="px-4 pt-1.5 pb-0.5">
          <NotificationBell navStyle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
          <NavLinks />
        </nav>

        {/* User Info + Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link
            to="/mypage"
            className="flex items-center gap-3 p-2 rounded bg-sidebar-accent hover:bg-primary/10 transition-colors"
          >
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={profile.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium shrink-0">
                {profile.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{profile.name}</p>
              {rewardSummary.equippedTitleId ? (
                <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
              ) : (
                <p className="text-xs text-muted-foreground/60 truncate">{t("nav.no_title")}</p>
              )}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-sidebar border-b border-sidebar-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-bold text-foreground">Kebo</h1>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="text-foreground"
            >
              {isMobileSidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-14"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <aside
            className="w-64 bg-sidebar h-full flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex-1 p-4">
              <NavLinks onNav={() => setIsMobileSidebarOpen(false)} />
            </nav>

            <div className="p-4 border-t border-sidebar-border space-y-2">
              <Link
                to="/mypage"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="flex items-center gap-3 p-2 rounded bg-sidebar-accent hover:bg-primary/10 transition-colors"
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={profile.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium shrink-0">
                    {profile.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{profile.name}</p>
                  {rewardSummary.equippedTitleId ? (
                    <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
                  ) : (
                    <p className="text-xs text-muted-foreground/60 truncate">{t("nav.no_title")}</p>
                  )}
                </div>
              </Link>
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                {t("nav.logout")}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <main
        className={`flex-1 mt-14 lg:mt-0 overflow-x-hidden transition-all duration-200 ${
          isSidebarCollapsed ? "lg:ml-0" : "lg:ml-56"
        }`}
      >
        <div key={location.key} className="p-4 sm:p-6 min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  );
}
