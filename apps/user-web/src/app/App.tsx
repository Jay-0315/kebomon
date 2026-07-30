import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import NetworkErrorToast from "./components/NetworkErrorToast";
import AuthExpiredToast from "./components/AuthExpiredToast";
import MaintenanceGate from "./components/MaintenanceGate";
import Layout from "./components/Layout";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import CommunityPage from "./components/CommunityPage";
import PostDetailPage from "./components/PostDetailPage";
import MyPage from "./components/MyPage";
import KebomonPage from "./components/KebomonPage";
import LiveChatPage from "./components/LiveChatPage";
import RaidPage from "./components/RaidPage";
import ColosseumPage from "./components/ColosseumPage";
import HallOfFamePage from "./components/HallOfFamePage";
import RoguePage from "./components/RoguePage";
import DuelPage from "./components/DuelPage";
import ExpeditionPage from "./components/ExpeditionPage";
import FishingPage from "./components/FishingPage";
import AuctionPage from "./components/AuctionPage";
import GuildPage from "./components/GuildPage";
import ShopPage from "./components/ShopPage";
import SettingsPage from "./components/SettingsPage";
import StarterSelectionPage from "./components/StarterSelectionPage";
import AttendancePage from "./components/AttendancePage";
import MissionPage from "./components/MissionPage";
import GachaPage from "./components/GachaPage";
import PublicProfilePage from "./components/PublicProfilePage";
import UserSearchPage from "./components/UserSearchPage";
import { useAppData } from "./context/AppDataContext";
import { isAuthenticated, getStoredUser, setAuthToken } from "./lib/auth";
import { api } from "./lib/api";
import { LangProvider } from "./context/LangContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function StarterRoute({ children }: { children: React.ReactNode }) {
  const { hasInitialized, rewardsFailed, rewardSummary } = useAppData();

  if (!hasInitialized) {
    return null;
  }

  if (!rewardsFailed && rewardSummary.ownedCharacterIds.length === 0) {
    return <Navigate to="/starter" replace />;
  }

  return <>{children}</>;
}

function StarterSelectionRoute() {
  const { hasInitialized, rewardsFailed, rewardSummary } = useAppData();

  if (!hasInitialized) {
    return null;
  }

  if (rewardsFailed || rewardSummary.ownedCharacterIds.length > 0) {
    return <Navigate to="/" replace />;
  }

  return <StarterSelectionPage />;
}

export default function App() {
  useEffect(() => {
    const ping = () => {
      if (!isAuthenticated()) return;
      const user = getStoredUser();
      if (!user) return;
      const todayKST = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
      if (localStorage.getItem("kebo-last-ping") === todayKST) return;
      localStorage.setItem("kebo-last-ping", todayKST);
      api.post("/rewards/ping", { userId: user.id }).catch(() => {});
    };

    // 로그인 세션(4시간) 슬라이딩 갱신 — ping과 달리 하루 1회 제한 없이, 활동 중일 때마다
    // 새 토큰을 받아 저장해서 계속 접속 중인 유저는 로그인이 끊기지 않게 함
    const refreshSession = () => {
      if (!isAuthenticated()) return;
      api
        .post<{ accessToken: string }>("/auth/refresh")
        .then((res) => setAuthToken(res.accessToken))
        .catch(() => {});
    };

    const tick = () => {
      ping();
      refreshSession();
    };

    tick();

    const onVisibility = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisibility);
    // 탭을 계속 켜놓은 채 시간이 흐르면(visibilitychange가 한 번도 안 걸리는 경우) 세션 갱신도
    // 안 되고 최근 로그인도 며칠씩 밀릴 수 있음 — 주기적으로 재시도해 보정
    const interval = setInterval(tick, 15 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, []);

  return (
    <BrowserRouter>
      <LangProvider>
      <MaintenanceGate>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/starter"
          element={
            <ProtectedRoute>
              <StarterSelectionRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <StarterRoute>
                <Layout />
              </StarterRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="community/:id" element={<PostDetailPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="profile/:userId" element={<PublicProfilePage />} />
          <Route path="search/users" element={<UserSearchPage />} />
          <Route path="kebomon" element={<KebomonPage />} />
          <Route path="gacha" element={<GachaPage />} />
          <Route path="live" element={<LiveChatPage />} />
          <Route path="mission" element={<MissionPage />} />
          <Route path="raid" element={<RaidPage />} />
          <Route path="colosseum" element={<ColosseumPage />} />
          <Route path="colosseum/hall-of-fame" element={<HallOfFamePage />} />
          <Route path="rogue" element={<RoguePage />} />
          <Route path="duel" element={<DuelPage />} />
          <Route path="expedition" element={<ExpeditionPage />} />
          <Route path="fishing" element={<FishingPage />} />
          <Route path="auction" element={<AuctionPage />} />
          <Route path="guild" element={<GuildPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="mypage/character" element={<Navigate to="/kebomon" replace />} />
        </Route>
      </Routes>
      </MaintenanceGate>
      <NetworkErrorToast />
      <AuthExpiredToast />
      </LangProvider>
    </BrowserRouter>
  );
}
