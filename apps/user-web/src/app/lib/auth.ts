import type { UserProfile } from "../types/domain";

const AUTH_TOKEN_KEY = "kebo-auth-token";
const AUTH_USER_KEY = "kebo-auth-user";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthSession(token: string, user: UserProfile) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem("authToken", token);
}

/** 로그인 세션 슬라이딩 갱신용 — 유저 정보는 그대로 두고 토큰만 교체 */
export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem("authToken", token);
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem("authToken");
}

export function getStoredUser(): UserProfile | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  return raw ? (JSON.parse(raw) as UserProfile) : null;
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
