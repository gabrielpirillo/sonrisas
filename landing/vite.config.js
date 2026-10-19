import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// La landing se publica dentro de la app Next: `npm run build` deja los archivos
// en ../public/landing y next.config.ts sirve /landing/index.html en "/".
export default defineConfig({
  plugins: [react()],
  base: "/landing/",
  // La sección "Por qué funciona" vive en ../components/science (compartida con
  // la app): forzar la copia de React de la landing.
  resolve: { dedupe: ["react", "react-dom"] },
  build: { outDir: "../public/landing", emptyOutDir: true },
});
