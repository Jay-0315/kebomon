import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import MaintenancePage from "./MaintenancePage";

type MaintenanceStatus = { enabled: boolean; message: string | null; endsAt: string | null };

const POLL_INTERVAL_MS = 30_000;

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const checkRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      api
        .get<MaintenanceStatus>("/maintenance/status")
        .then((res) => {
          if (!cancelled) setStatus(res);
        })
        .catch(() => {
          // 상태 확인 자체가 실패하면(네트워크 오류 등) 서비스가 막혀있다고 오판하지 않도록 정상으로 간주
          if (!cancelled) setStatus((prev) => prev ?? { enabled: false, message: null, endsAt: null });
        });
    };
    checkRef.current = check;

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    // API 요청이 503(점검 중)을 받으면 폴링 주기를 기다리지 않고 즉시 전환
    const onMaintenanceEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string | null; endsAt: string | null }>).detail;
      if (!cancelled) setStatus({ enabled: true, message: detail?.message ?? null, endsAt: detail?.endsAt ?? null });
    };
    window.addEventListener("kebo:maintenance", onMaintenanceEvent);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("kebo:maintenance", onMaintenanceEvent);
    };
  }, []);

  // 종료 예정 시각이 지정돼 있으면, 30초 폴링을 기다리지 않고 그 시각에 맞춰 즉시 재확인
  // (서버 캐시 TTL을 감안해 한 번 더 재시도)
  useEffect(() => {
    if (!status?.enabled || !status.endsAt) return;
    const delay = Math.max(0, new Date(status.endsAt).getTime() - Date.now());
    const t1 = setTimeout(() => checkRef.current(), delay);
    const t2 = setTimeout(() => checkRef.current(), delay + 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [status?.enabled, status?.endsAt]);

  // 최초 확인 전에는 실제 앱 화면이 잠깐 보였다가 점검 화면으로 튕기는 것을 막기 위해 아무것도 렌더링하지 않음
  if (status === null) return null;
  if (status.enabled) return <MaintenancePage message={status.message} endsAt={status.endsAt} />;
  return <>{children}</>;
}
