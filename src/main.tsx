import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <StrictMode>
    <main className="grid min-h-dvh place-items-center">Hiwar</main>
  </StrictMode>,
);
