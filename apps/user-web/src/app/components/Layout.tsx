import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  Home, User, Settings, Menu, X, Gamepad2, LogOut, Newspaper, PanelLeftClose,
  PanelLeft, Swords, CalendarCheck, Trophy, Shield, Layers, Map, ShoppingBag,
  ChevronDown, BookOpen, Star, Zap,
} from "lucide-react";
import Footer from "./Footer";
import { AchievementRevealModal } from "./KebomonPage";
import { useState, useEffect } from "react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { clearAuthSession } from "../lib/auth";
import TitleBadge from "./TitleBadge";
import NotificationBell from "./NotificationBell";
import UserAvatar from "./UserAvatar";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("sidebarCollapsed") === "1",
  );
  const [kebomonOpen, setKebomonOpen] = useState(() => {
    return typeof window !== "undefined" && localStorage.getItem("navKebomonOpen") !== "0";
  });
  const [missionOpen, setMissionOpen] = useState(() => {
    return typeof window !== "undefined" && localStorage.getItem("navMissionOpen") !== "0";
  });

  const toggleKebomon = () => setKebomonOpen(p => { localStorage.setItem("navKebomonOpen", p ? "0" : "1"); return !p; });
  const toggleMission = () => setMissionOpen(p => { localStorage.setItem("navMissionOpen", p ? "0" : "1"); return !p; });

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  };
  const { profile, rewardSummary, profilePhoto, pendingAchievements, clearPendingAchievements } = useAppData();
  const { lang, t } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);
  const isTabActive = (path: string, tab: string) =>
    location.pathname.startsWith(path) && location.search.includes(`tab=${tab}`);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
    window.location.reload();
  };

  const NavLink = ({ to, icon: Icon, label, exact = false, sub = false, onNav }: {
    to: string; icon: React.ElementType; label: string; exact?: boolean; sub?: boolean; onNav?: () => void;
  }) => {
    const active = isActive(to, exact);
    return (
      <Link
        to={to}
        onClick={onNav}
        className={`flex items-center gap-3 rounded transition-colors ${
          sub ? "pl-9 pr-3 py-1.5 text-sm" : "px-3 py-2 text-[15px] font-medium"
        } ${active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
      >
        <Icon className={`shrink-0 ${sub ? "w-4 h-4" : "w-[18px] h-[18px]"}`} />
        <span>{label}</span>
      </Link>
    );
  };

  const NavTabLink = ({ to, tab, icon: Icon, label, onNav }: {
    to: string; tab: string; icon: React.ElementType; label: string; onNav?: () => void;
  }) => {
    const active = isTabActive(to, tab) || (tab === "character" && location.pathname === to && !location.search);
    return (
      <Link
        to={`${to}?tab=${tab}`}
        onClick={onNav}
        className={`flex items-center gap-3 pl-9 pr-3 py-1.5 rounded transition-colors text-sm ${
          active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </Link>
    );
  };

  const GroupHeader = ({ icon: Icon, label, open, onToggle }: {
    icon: React.ElementType; label: string; open: boolean; onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-3 py-2 rounded text-[15px] font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
  );

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <div className="space-y-0.5">
      <NavLink to="/" icon={Home}           label={ko?"홈":ja?"ホーム":"Home"} exact onNav={onNav} />
      <NavLink to="/community" icon={Newspaper} label={ko?"커뮤니티":ja?"コミュニティ":"Community"} onNav={onNav} />
      <NavLink to="/attendance" icon={CalendarCheck} label={ko?"출석":ja?"出席":"Attendance"} onNav={onNav} />
      <NavLink to="/gacha" icon={ShoppingBag} label={ko?"뽑기":ja?"ガチャ":"Gacha"} onNav={onNav} />

      {/* 케보몬 group */}
      <GroupHeader
        icon={Gamepad2}
        label={ko?"케보몬":ja?"ケボモン":"Kebomon"}
        open={kebomonOpen}
        onToggle={toggleKebomon}
      />
      {kebomonOpen && (
        <div className="space-y-0.5">
          <NavTabLink to="/kebomon" tab="character"   icon={Zap}         label={ko?"강화":ja?"強化":"Enhance"} onNav={onNav} />
          <NavTabLink to="/kebomon" tab="collection"  icon={BookOpen}    label={ko?"도감":ja?"図鑑":"Pokedex"} onNav={onNav} />
          <NavTabLink to="/kebomon" tab="achievement" icon={Star}        label={ko?"업적":ja?"業績":"Achieve"} onNav={onNav} />
        </div>
      )}

      {/* 미션 group */}
      <GroupHeader
        icon={Swords}
        label={ko?"미션":ja?"ミッション":"Mission"}
        open={missionOpen}
        onToggle={toggleMission}
      />
      {missionOpen && (
        <div className="space-y-0.5">
          <NavLink to="/colosseum"  icon={Trophy}  label={ko?"콜로세움":ja?"コロシアム":"Colosseum"} sub onNav={onNav} />
          <NavLink to="/raid"       icon={Shield}  label={ko?"보스레이드":ja?"ボスレイド":"Raid"}      sub onNav={onNav} />
          <NavLink to="/rogue"      icon={Layers}  label={ko?"로그라이크":ja?"ローグライク":"Roguelike"} sub onNav={onNav} />
          <NavLink to="/expedition" icon={Map}     label={ko?"원정":ja?"遠征":"Expedition"}            sub onNav={onNav} />
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-sidebar-border space-y-0.5">
        <NavLink to="/mypage"   icon={User}     label={ko?"마이페이지":ja?"マイページ":"My Page"} onNav={onNav} />
        <NavLink to="/settings" icon={Settings} label={ko?"설정":ja?"設定":"Settings"} onNav={onNav} />
      </div>
    </div>
  );

  return (
    <>
    {pendingAchievements.length > 0 && (
      <AchievementRevealModal
        newlyUnlocked={pendingAchievements}
        onClose={clearPendingAchievements}
        t={t}
      />
    )}
    <div className="min-h-screen bg-background flex">
      {isSidebarCollapsed && (
        <button
          onClick={toggleSidebarCollapsed}
          title="사이드바 펼치기"
          className="hidden lg:flex fixed top-4 left-4 z-50 items-center justify-center w-10 h-10 rounded-lg bg-sidebar border border-sidebar-border shadow-md text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col w-56 bg-sidebar border-r border-sidebar-border fixed h-screen z-30 transition-transform duration-200 ${
          isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
            <img src="/logo(light).png" alt="Kebo" className="h-16 w-auto shrink-0 object-contain dark:hidden" />
            <img src="/logo(dark).png"  alt="Kebo" className="h-16 w-auto shrink-0 object-contain hidden dark:block" />
          </Link>
          <button onClick={toggleSidebarCollapsed} title="사이드바 접기" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link to="/mypage" className="flex items-center gap-3 p-2 rounded bg-sidebar-accent hover:bg-primary/10 transition-colors">
            <UserAvatar authorId={profile.id} authorName={profile.name} size="md" photoUrl={profilePhoto} borderId={rewardSummary.equippedBorderId ?? null} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{profile.name}</p>
              {rewardSummary.equippedTitleId ? (
                <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
              ) : (
                <p className="text-xs text-muted-foreground/60 truncate">{ko?"장착중인 칭호 없음":ja?"称号なし":"No title"}</p>
              )}
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            {ko?"로그아웃":ja?"ログアウト":"Logout"}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-sidebar border-b border-sidebar-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="text-foreground">
            {isMobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src="/logo(light).png" alt="Kebo" className="h-10 w-auto object-contain dark:hidden" />
            <img src="/logo(dark).png"  alt="Kebo" className="h-10 w-auto object-contain hidden dark:block" />
          </Link>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-14" onClick={() => setIsMobileSidebarOpen(false)}>
          <aside className="w-64 bg-sidebar h-full flex flex-col overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <nav className="flex-1 p-4">
              <NavLinks onNav={() => setIsMobileSidebarOpen(false)} />
            </nav>
            <div className="p-4 border-t border-sidebar-border space-y-2">
              <Link
                to="/mypage"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="flex items-center gap-3 p-2 rounded bg-sidebar-accent hover:bg-primary/10 transition-colors"
              >
                <UserAvatar authorId={profile.id} authorName={profile.name} size="md" photoUrl={profilePhoto} borderId={rewardSummary.equippedBorderId ?? null} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{profile.name}</p>
                  {rewardSummary.equippedTitleId ? (
                    <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
                  ) : (
                    <p className="text-xs text-muted-foreground/60 truncate">{ko?"장착중인 칭호 없음":ja?"称号なし":"No title"}</p>
                  )}
                </div>
              </Link>
              <button
                onClick={() => { setIsMobileSidebarOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                {ko?"로그아웃":ja?"ログアウト":"Logout"}
              </button>
            </div>
          </aside>
        </div>
      )}

      <NotificationBell floating />

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
    </>
  );
}
