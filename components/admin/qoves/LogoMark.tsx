/**
 * Marca de Smile Fast: sonrisa sobre un cuadrado redondeado (misma que el favicon).
 * - variant "navy": fondo navy, sonrisa azul claro (sobre fondos claros).
 * - variant "light": fondo translúcido claro (sobre fondos oscuros / sidebar navy).
 * - variant "outline": solo trazo, para usos pequeños sobre blanco.
 * `dark` se mantiene por compatibilidad: true → navy, false → outline.
 */
export function LogoMark({
    size = 34,
    dark,
    variant,
}: {
    size?: number;
    dark?: boolean;
    variant?: "navy" | "light" | "outline";
}) {
    const v = variant ?? (dark === false ? "outline" : "navy");
    const bg = v === "navy" ? "var(--navy-2, #1b2630)" : v === "light" ? "rgba(255,255,255,0.1)" : "transparent";
    const border = v === "outline" ? "1px solid var(--blue-line, #d3dee6)" : v === "light" ? "1px solid rgba(255,255,255,0.16)" : "none";
    const smile = v === "outline" ? "var(--blue-deep, #4f6b7f)" : "var(--blue-light, #b9cfdd)";
    const eyes = v === "outline" ? "var(--ink, #1c1e1d)" : "#fff";
    return (
        <span
            className="sf-logo-mark"
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.28),
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                background: bg,
                border,
            }}
        >
            <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 64 64" fill="none">
                <path d="M16 31c3.8 7.4 9 11 16 11s12.2-3.6 16-11" stroke={smile} strokeWidth={6} strokeLinecap="round" />
                <circle cx={23} cy={22} r={3.6} fill={eyes} />
                <circle cx={41} cy={22} r={3.6} fill={eyes} />
            </svg>
        </span>
    );
}

/** Logotipo "Smile Fast" (imagen de la landing). `tone` según el fondo. */
export function Wordmark({ tone = "dark", height = 20 }: { tone?: "dark" | "light"; height?: number }) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={tone === "light" ? "/brand/smilefast-white.png" : "/brand/smilefast-black.png"}
            alt="Smile Fast"
            style={{ height, width: "auto", display: "block" }}
        />
    );
}
