import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import NetworkErrorToast from "./components/NetworkErrorToast";
import AuthExpiredToast from "./components/AuthExpiredToast";
import MaintenanceGate from "./components/MaintenanceGate";
import Layout from "./components/Layout";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import StarterSelectionPage from "./components/StarterSelectionPage";
import { useAppData } from "./context/AppDataContext";
import { isAuthenticated, getStoredUser, setAuthToken } from "./lib/auth";
import { api } from "./lib/api";
import { LangProvider } from "./context/LangContext";

const CommunityPage = lazy(() => import("./components/CommunityPage"));
const HomePage = lazy(() => import("./components/HomePage"));
const PostDetailPage = lazy(() => import("./components/PostDetailPage"));
const MyPage = lazy(() => import("./components/MyPage"));
const KebomonPage = lazy(() => import("./components/KebomonPage"));
const LiveChatPage = lazy(() => import("./components/LiveChatPage"));
const RaidPage = lazy(() => import("./components/RaidPage"));
const ColosseumPage = lazy(() => import("./components/ColosseumPage"));
const HallOfFamePage = lazy(() => import("./components/HallOfFamePage"));
const RoguePage = lazy(() => import("./components/RoguePage"));
const DuelPage = lazy(() => import("./components/DuelPage"));
const ExpeditionPage = lazy(() => import("./components/ExpeditionPage"));
const FishingPage = lazy(() => import("./components/FishingPage"));
const AuctionPage = lazy(() => import("./components/AuctionPage"));
const TowerDefensePage = lazy(() => import("./components/TowerDefensePage"));
const GuildPage = lazy(() => import("./components/GuildPage"));
const ShopPage = lazy(() => import("./components/ShopPage"));
const SettingsPage = lazy(() => import("./components/SettingsPage"));
const AttendancePage = lazy(() => import("./components/AttendancePage"));
const MissionPage = lazy(() => import("./components/MissionPage"));
const GachaPage = lazy(() => import("./components/GachaPage"));
const PublicProfilePage = lazy(() => import("./components/PublicProfilePage"));
const UserSearchPage = lazy(() => import("./components/UserSearchPage"));

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

function PageFallback() {
  return <div className="p-6 text-sm text-muted-foreground">페이지를 불러오는 중입니다...</div>;
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
      <Suspense fallback={<PageFallback />}>
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
          <Route path="tower-defense" element={<TowerDefensePage />} />
          <Route path="guild" element={<GuildPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="mypage/character" element={<Navigate to="/kebomon" replace />} />
        </Route>
      </Routes>
      </Suspense>
      </MaintenanceGate>
      <NetworkErrorToast />
      <AuthExpiredToast />
      </LangProvider>
    </BrowserRouter>
  );
}
