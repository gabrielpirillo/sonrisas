# Smile Fast × Qoves

Landing B2B de Smile Fast para clínicas dentales, portada desde el diseño
"Smile Forward - Qoves" de Claude Design a una app React + Vite.

## Desarrollo

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview
```

La salida queda en `dist/` (sitio estático). Vercel detecta Vite automáticamente.

## Estructura

```
src/
  App.jsx                 raíz: landing + modal de demo
  main.jsx                entrada: estilos, recursos y web components
  resources.js            mapa de imágenes (claves iguales al export original)
  components/
    Landing.jsx           todas las secciones de la landing
    shared.jsx            componentes visuales compartidos (before/after, VITA, etc.)
    AppJourney.jsx        sección "Dentro de la app, paso a paso"
    DemoModal.jsx         popup "Solicitar DEMO"
    TrustStrip.jsx        franja de confianza bajo el hero (3 variantes)
  styles/
    fonts.css             General Sans + JetBrains Mono (self-hosted)
    qoves.css             sistema visual Qoves
  assets/                 imágenes y fuentes
```
