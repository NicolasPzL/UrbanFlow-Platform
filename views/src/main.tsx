
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Verificar que el elemento root existe y no está ya montado
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Verificar si ya hay un root montado
if (rootElement.hasChildNodes()) {
  console.warn("Root element already has children, clearing...");
  rootElement.innerHTML = "";
}

const root = createRoot(rootElement);
root.render(<App />);
  