import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import Layout from "./components/Layout";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import ExpensesPage from "./components/ExpensesPage";
import CommunityPage from "./components/CommunityPage";
import PostDetailPage from "./components/PostDetailPage";
import GroupsPage from "./components/GroupsPage";
import GroupDetailPage from "./components/GroupDetailPage";
import MyPage from "./components/MyPage";
import KabemonPage from "./components/KabemonPage";
import LiveChatPage from "./components/LiveChatPage";
import RaidPage from "./components/RaidPage";
import GroupExpensesPage from "./components/GroupExpensesPage";
import SettingsPage from "./components/SettingsPage";
import StarterSelectionPage from "./components/StarterSelectionPage";
import { useAppData } from "./context/AppDataContext";
import { isAuthenticated } from "./lib/auth";
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
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="community/:id" element={<PostDetailPage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:id" element={<GroupDetailPage />} />
          <Route path="groups/:id/expenses" element={<GroupExpensesPage />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="kabemon" element={<KabemonPage />} />
          <Route path="live" element={<LiveChatPage />} />
          <Route path="raid" element={<RaidPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Legacy redirect */}
          <Route path="mypage/character" element={<Navigate to="/kabemon" replace />} />
        </Route>
      </Routes>
      </LangProvider>
    </BrowserRouter>
  );
}
