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
    const src = `${origin}/widget${widgetKey ? `?key=${encodeURIComponent(widgetKey)}` : ""}`;
    return `<div style="width:100%; max-width:1200px; margin:0 auto; aspect-ratio:16/9; min-height:500px; overflow:hidden; border-radius:2rem; border:1px solid #d3dee6; background:#fff;">
  <iframe
    src="${src}"
    width="100%" height="100%" frameborder="0"
    allow="camera; microphone; clipboard-read; clipboard-write"
    style="border:none;"
  ></iframe>
</div>`;
}
