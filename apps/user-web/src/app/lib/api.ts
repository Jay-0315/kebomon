import { getAuthToken } from "./auth";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"
).replace(/\/$/, "");

export type NetworkErrorType = "timeout" | "offline";

export class NetworkError extends Error {
  constructor(public readonly type: NetworkErrorType) {
    super(type);
    this.name = "NetworkError";
  }
}

function emitNetworkError(type: NetworkErrorType) {
  window.dispatchEvent(new CustomEvent("kebo:network-error", { detail: type }));
}

function emitAuthExpired() {
  window.dispatchEvent(new CustomEvent("kebo:auth-expired"));
}

function emitMaintenance(detail: { message: string | null; endsAt: string | null }) {
  window.dispatchEvent(new CustomEvent("kebo:maintenance", { detail }));
}

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
      // 로그인된 상태에서 401을 받으면 토큰이 만료/무효화된 것 — 인증이 필요 없는
      // 로그인/회원가입 자체의 실패(토큰 없음)와 구분하기 위해 기존 토큰 존재 여부로 판단
      if (response.status === 401 && token) {
        emitAuthExpired();
      }

      // NestJS 에러 응답 바디: { statusCode, message, error } — message는
      // BadRequestException("텍스트")면 문자열, class-validator 검증 실패면 문자열 배열
      let body: { message?: string | string[]; maintenance?: boolean; endsAt?: string } | null = null;
      try {
        body = await response.json();
      } catch {
        /* 바디 파싱 실패는 무시 — 아래에서 HTTP {status}로 폴백 */
      }

      if (response.status === 503 && body?.maintenance) {
        emitMaintenance({ message: (body.message as string) ?? null, endsAt: body.endsAt ?? null });
      }

      const serverMessage = Array.isArray(body?.message)
        ? body.message.join(" ")
        : body?.message;
      const error = new Error(serverMessage || `HTTP ${response.status}`) as Error & {
        status: number;
      };
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    // NestJS는 컨트롤러가 null/undefined를 반환하면 200이어도 완전히 빈 바디를 보낸다 —
    // 이 경우 response.json()이 "Unexpected end of JSON input"으로 죽으므로 먼저 텍스트로 확인
    const text = await response.text();
    if (!text) {
      return null as unknown as T;
    }
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      emitNetworkError("timeout");
      throw new NetworkError("timeout");
    }
    if (
      err instanceof TypeError &&
      (err.message.includes("fetch") || err.message.includes("network"))
    ) {
      emitNetworkError("offline");
      throw new NetworkError("offline");
    }
    throw err;
  } finally {
    clearTimeout(timer);
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
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),
};
