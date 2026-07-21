import { useEffect, useState } from "react";
import { api } from "../lib/api";
import MaintenancePage from "./MaintenancePage";

type MaintenanceStatus = { enabled: boolean; message: string | null; endsAt: string | null };

const POLL_INTERVAL_MS = 30_000;

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);

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

  // 최초 확인 전에는 실제 앱 화면이 잠깐 보였다가 점검 화면으로 튕기는 것을 막기 위해 아무것도 렌더링하지 않음
  if (status === null) return null;
  if (status.enabled) return <MaintenancePage message={status.message} endsAt={status.endsAt} />;
  return <>{children}</>;
}
