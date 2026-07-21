
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AppDataProvider } from "./app/context/AppDataContext.tsx";
import "./styles/index.css";

// manifest.json만으로는 설치(홈 화면에 추가)가 불가능 — 활성 서비스워커가 페이지를 컨트롤해야
// 브라우저가 설치 가능하다고 판단함. 푸시 알림 권한(registerPush)과는 별개로, 권한 요청 없이
// 등록만 미리 해둔다.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

createRoot(document.getElementById("root")!).render(
  <AppDataProvider>
    <App />
  </AppDataProvider>,
);

