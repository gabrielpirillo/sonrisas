"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_WIDGET_CONFIG, normalizeWidgetConfig, type WidgetConfig } from "@/lib/widgetConfig";

/**
 * A quién habla el widget. "patient" (por defecto) es el widget real en la web
 * de una clínica; "owner" es la demo pública (/demo), donde quien lo prueba es
 * el dueño de una clínica evaluando Smile Fast.
 */
export type WidgetAudience = "patient" | "owner";

export interface WidgetConfigState {
    config: WidgetConfig;
    clinicName: string;
    /** Vista previa del panel: no se guardan leads ni se generan simulaciones. */
    preview: boolean;
    audience: WidgetAudience;
}

const Ctx = createContext<WidgetConfigState>({ config: DEFAULT_WIDGET_CONFIG, clinicName: "", preview: false, audience: "patient" });

/** En la demo, el subtítulo del formulario explica qué ve el paciente (no promete enviar nada). */
const OWNER_SUBTITLE = "Así lo verá tu paciente: el widget pide nombre y contacto antes de la simulación.";

export const useWidgetConfig = () => useContext(Ctx);

/**
 * Carga la configuración del widget por la clave pública (?key=). En modo
 * vista previa (?preview=1) además escucha los borradores que envía el panel
 * por postMessage (mismo origen) y los aplica al instante.
 */
export function WidgetConfigProvider({ children, audience = "patient" }: { children: React.ReactNode; audience?: WidgetAudience }) {
    // `preview` no cambia lo que se pinta (solo evita guardar datos), así que
    // puede leerse de la URL al iniciar sin riesgo de desajuste de hidratación.
    const [state, setState] = useState<Omit<WidgetConfigState, "audience">>(() => ({
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

    const value = useMemo<WidgetConfigState>(
        () =>
            audience === "owner"
                ? { ...state, audience, config: { ...state.config, texts: { ...state.config.texts, subtitle: OWNER_SUBTITLE } } }
                : { ...state, audience },
        [state, audience],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
