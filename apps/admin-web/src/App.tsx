import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AdminLayout from "./components/AdminLayout";
import { isAdminAuthenticated, isSuperAdmin, setAuthToken } from "./lib/auth";
import { api } from "./lib/api";
import { LangProvider } from "./context/LangContext";
import { ToastProvider } from "./context/ToastContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import CommunityPostsPage from "./pages/CommunityPostsPage";
import CommunityCommentsPage from "./pages/CommunityCommentsPage";
import GachaConfigPage from "./pages/GachaConfigPage";
import BattlesPage from "./pages/BattlesPage";
import NotificationsPage from "./pages/NotificationsPage";
import GuildsPage from "./pages/GuildsPage";
import CharactersPage from "./pages/CharactersPage";
import ReportsPage from "./pages/ReportsPage";
import InquiriesPage from "./pages/InquiriesPage";
import MaintenancePage from "./pages/MaintenancePage";
import BannersPage from "./pages/BannersPage";
import UserDetailPage from "./pages/UserDetailPage";
import GuildDetailPage from "./pages/GuildDetailPage";
import AdminAccountsPage from "./pages/AdminAccountsPage";
import AdminActionLogPage from "./pages/AdminActionLogPage";
import SeasonPage from "./pages/SeasonPage";
import AuctionPage from "./pages/AuctionPage";
import TowerDefensePage from "./pages/TowerDefensePage";
import FishingPage from "./pages/FishingPage";
import RoguePage from "./pages/RoguePage";
import ExpeditionPage from "./pages/ExpeditionPage";

function AdminRoute({ children }: { children: React.ReactNode }) {
  return isAdminAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAdminAuthenticated()) return <Navigate to="/login" replace />;
  return isSuperAdmin() ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// 프로덕션에서는 web 컨테이너가 /admin/ 하위 경로로 프록시하므로 라우터도 그 경로를 기준으로 매칭.
// 로컬 dev 서버는 프록시 없이 루트에서 뜨므로 basename 없이 그대로 사용.
const basename = import.meta.env.PROD ? "/admin" : undefined;

export default function App() {
  useEffect(() => {
    // 로그인 세션(4시간) 슬라이딩 갱신 — 관리자가 계속 접속 중이면 로그인이 끊기지 않게 함
    const refreshSession = () => {
      if (!isAdminAuthenticated()) return;
      api
        .post<{ accessToken: string }>("/auth/refresh")
        .then((res) => setAuthToken(res.accessToken))
        .catch(() => {});
    };

    refreshSession();
    const onVisibility = () => { if (document.visibilityState === "visible") refreshSession(); };
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(refreshSession, 15 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, []);

  return (
    <BrowserRouter basename={basename}>
      <LangProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/community/posts" element={<CommunityPostsPage />} />
            <Route path="/community/comments" element={<CommunityCommentsPage />} />
            <Route
              path="/gacha-config"
              element={
                <SuperAdminRoute>
                  <GachaConfigPage />
                </SuperAdminRoute>
              }
            />
            <Route path="/battles" element={<BattlesPage />} />
            <Route path="/auction" element={<AuctionPage />} />
            <Route path="/tower-defense" element={<TowerDefensePage />} />
            <Route path="/fishing" element={<FishingPage />} />
            <Route path="/rogue" element={<RoguePage />} />
            <Route path="/expedition" element={<ExpeditionPage />} />
            <Route path="/guilds" element={<GuildsPage />} />
            <Route path="/guilds/:id" element={<GuildDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route
              path="/characters"
              element={
                <SuperAdminRoute>
                  <CharactersPage />
                </SuperAdminRoute>
              }
            />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/inquiries" element={<InquiriesPage />} />
            <Route
              path="/maintenance"
              element={
                <SuperAdminRoute>
                  <MaintenancePage />
                </SuperAdminRoute>
              }
            />
            <Route path="/banners" element={<BannersPage />} />
            <Route
              path="/season"
              element={
                <SuperAdminRoute>
                  <SeasonPage />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/admin-accounts"
              element={
                <SuperAdminRoute>
                  <AdminAccountsPage />
                </SuperAdminRoute>
              }
            />
            <Route path="/action-log" element={<AdminActionLogPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </LangProvider>
    </BrowserRouter>
  );
}
