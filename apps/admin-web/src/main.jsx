import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return (
    <main style={{ minHeight: "100%", display: "grid", placeItems: "center", padding: "24px" }}>
      <section
        style={{
          width: "100%",
          maxWidth: "720px",
          border: "1px solid #2a2a2a",
          borderRadius: "16px",
          padding: "32px",
          background: "#1a1a1a",
        }}
      >
        <p style={{ color: "#b7607e", marginTop: 0 }}>KEBO</p>
        <h1 style={{ marginTop: 0 }}>관리자 웹</h1>
        <p style={{ color: "#a3a3a3", lineHeight: 1.6 }}>
          사용자 신고, 환율 관리, 커뮤니티 운영, 리워드 정책 설정을 위한 관리자 전용 앱 자리입니다.
        </p>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
