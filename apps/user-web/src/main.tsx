
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { AppDataProvider } from "./app/context/AppDataContext.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <AppDataProvider>
    <App />
  </AppDataProvider>,
);
  
