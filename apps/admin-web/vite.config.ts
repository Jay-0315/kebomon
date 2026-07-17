import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  // 프로덕션에서는 web 컨테이너 nginx가 /admin/ 하위 경로로 프록시하므로 그 경로를 기준으로 빌드.
  // 로컬 dev 서버는 프록시 없이 루트에서 바로 뜨므로 그대로 "/" 유지.
  base: command === "build" ? "/admin/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
}));
