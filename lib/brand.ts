/**
 * Marca Smile Fast en TypeScript (para gráficos, estados y estilos en línea).
 * Debe coincidir con los tokens CSS de app/globals.css.
 */
export const BRAND_NAME = "Smile Fast";

export const C = {
    ink: "#1c1e1d",
    ink2: "#565b59",
    ink3: "#8a8f8c",
    sage: "#97a39e",
    line: "#e8eae8",
    blue: "#8ea4b4",
    blueAccent: "#7d97aa",
    blueDeep: "#4f6b7f",
    blueInk: "#3e5769",
    blueLine: "#d3dee6",
    blueSoft: "#e7eef3",
    blueTint: "#f2f6f9",
    blueLight: "#b9cfdd",
    navy1: "#2a3a47",
    navy2: "#1b2630",
    navy3: "#131b22",
    scan: "#06b6d4",
    danger: "#b5675e",
    dangerSoft: "#f6ebe9",
} as const;

/** Estados de lead: una sola escala, de menor a mayor avance. */
export const LEAD_STATUS: Record<string, { label: string; dot: string; bg: string; border: string; text: string }> = {
    pending: { label: "Pendiente", dot: C.blue, bg: C.blueTint, border: C.blueLine, text: C.ink2 },
    contacted: { label: "Contactado", dot: C.blueDeep, bg: C.blueSoft, border: C.blueLight, text: C.blueInk },
    converted: { label: "Convertido", dot: C.blueLight, bg: C.navy2, border: C.navy2, text: "#ffffff" },
    rejected: { label: "Rechazado", dot: C.danger, bg: C.dangerSoft, border: "#ecd3cf", text: "#8f4f47" },
};

/** Estados de clínica / usuario en la consola de plataforma. */
export const CLINIC_STATUS: Record<string, { label: string; dot: string }> = {
    active: { label: "Activa", dot: C.blueDeep },
    trial: { label: "Prueba", dot: C.blueLight },
    suspended: { label: "Suspendida", dot: C.danger },
    banned: { label: "Bloqueado", dot: C.danger },
};

/** Barras de distribución (de más oscuro a más claro). */
export const SERIES = [C.navy2, C.blueDeep, C.blueAccent, C.blueLight] as const;

/** Series de gráficos (imágenes, videos, etc.). */
export const CHART = {
    primary: C.blueDeep,
    secondary: C.blueLight,
    tertiary: C.sage,
    grid: C.blueLine,
    axis: C.ink3,
    areaFrom: "rgba(79, 107, 127, 0.28)",
    areaTo: "rgba(79, 107, 127, 0)",
} as const;
