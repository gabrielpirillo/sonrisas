"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { Camera, Glasses, ScanFace, Smile, Sparkles, Sun, UserRound } from "lucide-react";

/** Por debajo de este número de simulaciones restantes se avisa de recargar. */
export const LOW_SIMS = 10;
export const EASE = [0.22, 1, 0.36, 1] as const;
/** Mensaje con el que el widget embebido avisa su altura (nombre heredado). */
export const RESIZE_TYPE = "smileforward-resize";

/** Mismo corte que el panel (< 768 px) y, además, teléfonos en horizontal. */
export const PHONE_QUERY = "(max-width: 767px), (pointer: coarse) and (max-height: 500px)";

/** null en el servidor y durante la hidratación; después, si la consulta coincide. */
export function useMediaQuery(query: string): boolean | null {
    const subscribe = useCallback((cb: () => void) => {
        const m = window.matchMedia(query);
        m.addEventListener("change", cb);
        return () => m.removeEventListener("change", cb);
    }, [query]);
    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => null);
}

export type CreditInfo = { sims: number | null; empty: boolean; low: boolean };

export function creditInfo(balance: number, imageCost: number | null): CreditInfo {
    const sims = imageCost ? Math.floor(Math.max(0, balance) / imageCost) : null;
    return {
        sims,
        empty: sims !== null ? sims <= 0 : balance <= 0,
        low: sims !== null ? sims < LOW_SIMS : balance < LOW_SIMS,
    };
}

export const STEPS: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <UserRound size={20} />, title: "Datos", text: "Nombre y contacto del paciente. Quedan guardados como lead." },
    { icon: <Camera size={20} />, title: "Foto", text: "Una foto de frente sonriendo, con la cámara o desde la galería." },
    { icon: <Sparkles size={20} />, title: "Resultado", text: "La IA muestra el antes y el después en segundos." },
];

export const TIPS: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <Sun size={20} />, title: "Luz frontal", text: "Que la luz le dé de frente, mejor natural. Evita contraluces y sombras en la boca." },
    { icon: <Smile size={20} />, title: "Sonrisa natural", text: "Sonrisa amplia y relajada, mostrando los dientes de arriba. Sin forzarla." },
    { icon: <Glasses size={20} />, title: "Sin lentes de sol", text: "Cara despejada: sin lentes de sol, gorras ni pelo tapando el rostro." },
    { icon: <ScanFace size={20} />, title: "De frente y cerca", text: "Cámara a la altura de los ojos, rostro centrado y enfocado." },
];

export function widgetSrc(widgetKey: string) {
    return `/widget?key=${encodeURIComponent(widgetKey)}&embed=widget`;
}
