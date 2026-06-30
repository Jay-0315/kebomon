import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import NetworkErrorToast from "./components/NetworkErrorToast";
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
import RoguePage from "./components/RoguePage";
import DuelPage from "./components/DuelPage";
import ExpeditionPage from "./components/ExpeditionPage";
import ShopPage from "./components/ShopPage";
import SettingsPage from "./components/SettingsPage";
import StarterSelectionPage from "./components/StarterSelectionPage";
import AttendancePage from "./components/AttendancePage";
import MissionPage from "./components/MissionPage";
import GachaPage from "./components/GachaPage";
import { useAppData } from "./context/AppDataContext";
import { isAuthenticated, getStoredUser } from "./lib/auth";
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

    ping();

    const onVisibility = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <BrowserRouter>
      <LangProvider>
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
          <Route path="kebomon" element={<KebomonPage />} />
          <Route path="gacha" element={<GachaPage />} />
          <Route path="live" element={<LiveChatPage />} />
          <Route path="mission" element={<MissionPage />} />
          <Route path="raid" element={<RaidPage />} />
          <Route path="colosseum" element={<ColosseumPage />} />
          <Route path="rogue" element={<RoguePage />} />
          <Route path="duel" element={<DuelPage />} />
          <Route path="expedition" element={<ExpeditionPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="mypage/character" element={<Navigate to="/kebomon" replace />} />
        </Route>
      </Routes>
      <NetworkErrorToast />
      </LangProvider>
    </BrowserRouter>
  );
}
