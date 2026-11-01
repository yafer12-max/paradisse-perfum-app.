import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { cargarCatalogo } from "./catalogo.js";

(async () => {
  await cargarCatalogo(); // trae la hoja de Google (si está configurada) antes de dibujar la tienda
  const { default: App } = await import("./App.jsx");
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("No se pudo registrar el modo instalable de NovaScents:", error);
    });
  });
}
