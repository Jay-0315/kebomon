import { clearAuthSession, getAuthToken } from "./auth";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/$/, "");

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      if (response.status === 401 && token) {
        clearAuthSession();
        window.location.href = import.meta.env.PROD ? "/admin/login" : "/login";
      }
      const text = await response.text().catch(() => "");
      const error = new Error(text || `HTTP ${response.status}`) as Error & {
        status: number;
      };
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    if (!text) {
      return null as unknown as T;
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** api 요청 실패 시 서버가 내려준 원본 에러 메시지(JSON body의 message)를 추출 — 파싱 실패 시 undefined */
export function getErrorMessage(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  try {
    const parsed = JSON.parse(err.message) as { message?: string };
    return typeof parsed.message === "string" ? parsed.message : undefined;
  } catch {
    return undefined;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),
};
