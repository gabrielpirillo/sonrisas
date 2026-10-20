"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_WIDGET_CONFIG, normalizeWidgetConfig, type WidgetConfig } from "@/lib/widgetConfig";

export interface WidgetConfigState {
    config: WidgetConfig;
    clinicName: string;
    /** Vista previa del panel: no se guardan leads ni se generan simulaciones. */
    preview: boolean;
}

const Ctx = createContext<WidgetConfigState>({ config: DEFAULT_WIDGET_CONFIG, clinicName: "", preview: false });

export const useWidgetConfig = () => useContext(Ctx);

/**
 * Carga la configuración del widget por la clave pública (?key=). En modo
 * vista previa (?preview=1) además escucha los borradores que envía el panel
 * por postMessage (mismo origen) y los aplica al instante.
 */
export function WidgetConfigProvider({ children }: { children: React.ReactNode }) {
    // `preview` no cambia lo que se pinta (solo evita guardar datos), así que
    // puede leerse de la URL al iniciar sin riesgo de desajuste de hidratación.
    const [state, setState] = useState<WidgetConfigState>(() => ({
        config: DEFAULT_WIDGET_CONFIG,
        clinicName: "",
        preview: typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1",
    }));

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const key = params.get("key");
        const preview = params.get("preview") === "1";
        let cancelled = false;
        let draftReceived = false;

        fetch(`/api/widget/config${key ? `?key=${encodeURIComponent(key)}` : ""}`, { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled || !data || draftReceived) return;
                setState((s) => ({ ...s, config: normalizeWidgetConfig(data.config), clinicName: data.clinicName || "" }));
            })
            .catch(() => {});

        if (!preview) return () => { cancelled = true; };

        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (e.data?.type !== "smilefast-widget-config") return;
            draftReceived = true;
            setState((s) => ({ ...s, config: normalizeWidgetConfig(e.data.config) }));
        };
        window.addEventListener("message", onMessage);
        // Avisar al panel de que la vista previa está lista para recibir borradores.
        window.parent?.postMessage({ type: "smilefast-widget-ready" }, window.location.origin);
        return () => {
            cancelled = true;
            window.removeEventListener("message", onMessage);
        };
    }, []);

    return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
