import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AdminLayout from "./components/AdminLayout";
import { isAdminAuthenticated, setAuthToken } from "./lib/auth";
import { api } from "./lib/api";
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

function AdminRoute({ children }: { children: React.ReactNode }) {
  return isAdminAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
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
          <Route path="/gacha-config" element={<GachaConfigPage />} />
          <Route path="/battles" element={<BattlesPage />} />
          <Route path="/guilds" element={<GuildsPage />} />
          <Route path="/guilds/:id" element={<GuildDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/banners" element={<BannersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
