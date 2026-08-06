export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const AUTH_TOKEN_KEY = "kebo-admin-token";
const AUTH_USER_KEY = "kebo-admin-user";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthSession(token: string, user: AdminUser) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

/** 로그인 세션 슬라이딩 갱신용 — 유저 정보는 그대로 두고 토큰만 교체 */
export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUser(): AdminUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  return raw ? (JSON.parse(raw) as AdminUser) : null;
}

export function isAdminAuthenticated() {
  const role = getStoredUser()?.role;
  return Boolean(getAuthToken()) && (role === "ADMIN" || role === "SUPER_ADMIN");
}

export function isSuperAdmin() {
  return getStoredUser()?.role === "SUPER_ADMIN";
}
