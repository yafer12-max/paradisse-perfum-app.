import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";

const productosJson = new URL("./src/productos.json", import.meta.url);
const exponerCatalogoJson = () => ({
  name: "novascents-productos-offline",
  configureServer(server) {
    server.middlewares.use("/productos.json", (_request, response) => {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(readFileSync(productosJson, "utf8"));
    });
  },
  generateBundle(_options, bundle) {
    this.emitFile({ type: "asset", fileName: "productos.json", source: readFileSync(productosJson, "utf8") });
    const applicationAssets = Object.keys(bundle).filter((file) => /\.(?:js|css)$/.test(file)).map((file) => `/${file}`);
    this.emitFile({ type: "asset", fileName: "precache-assets.json", source: JSON.stringify(applicationAssets) });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), exponerCatalogoJson()],
});
