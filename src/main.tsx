
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { applyTheme, storedTheme } from "./app/utils/theme";

  // Before the first render, so the page does not flash light before switching to dark
  applyTheme(storedTheme());

  createRoot(document.getElementById("root")!).render(<App />);
  