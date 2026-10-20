"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** Origen público del despliegue (cliente) o NEXT_PUBLIC_APP_URL en SSR. */
export function useAppOrigin(): string {
    return useSyncExternalStore(
        noopSubscribe,
        () => window.location.origin,
        () => process.env.NEXT_PUBLIC_APP_URL || "",
    );
}

/**
 * Código de instalación del widget. Es CONSTANTE: solo lleva la clave pública
 * de la clínica. Colores, textos y funciones viven en el servidor y el widget
 * los pide al cargar, así que nunca hay que volver a copiarlo.
 */
export function buildEmbedSnippet(origin: string, widgetKey?: string | null): string {
    const params = new URLSearchParams();
    if (widgetKey) params.set("key", widgetKey);
    params.set("embed", "widget");
    const src = `${origin}/widget?${params.toString()}`;
    // El iframe ajusta su alto al contenido (el widget avisa su altura por
    // postMessage), así se ve completo en móvil y en escritorio sin barras.
    return `<iframe id="smilefast-widget" src="${src}" title="Simulador de sonrisa"
  style="display:block; width:100%; max-width:1200px; height:760px; margin:0 auto; border:0; border-radius:24px; background:#fff;"
  allow="camera; clipboard-write" loading="lazy"></iframe>
<script>
  (function () {
    var f = document.getElementById("smilefast-widget");
    window.addEventListener("message", function (e) {
      if (e.origin !== "${origin}" || !f || e.source !== f.contentWindow) return;
      if (!e.data || e.data.type !== "smileforward-resize") return;
      var h = parseInt(e.data.height, 10);
      if (h > 0) f.style.height = Math.max(480, Math.min(h, 4000)) + "px";
    });
  })();
</script>`;
}
