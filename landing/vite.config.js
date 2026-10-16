import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// La landing se publica dentro de la app Next: `npm run build` deja los archivos
// en ../public/landing y next.config.ts sirve /landing/index.html en "/".
export default defineConfig({
  plugins: [react()],
  base: "/landing/",
  build: { outDir: "../public/landing", emptyOutDir: true },
});
