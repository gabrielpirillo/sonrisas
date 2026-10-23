"use client";

/* Miniatura del lead: la sonrisa simulada (salida de la generación) si existe;
   si no hay imagen o falla la carga, iniciales sobre azul acero. */

import { useCallback, useState } from "react";

/**
 * Normaliza un valor guardado (generations.input_path/output_path) a una URL
 * servible desde el panel. Las URLs de /api/storage/ se dejan RELATIVAS (mismo
 * origen) para que el proxy autorice por la sesión de la clínica aunque se
 * guardaran con otro dominio. Claves a secas → bucket generated.
 */
export function leadImageSrc(path?: string | null): string | null {
    if (!path || path === "unknown") return null;
    if (path.startsWith("data:") || path.startsWith("blob:")) return path;
    if (/^(https?:)?\/\//.test(path)) {
        const i = path.indexOf("/api/storage/");
        return i !== -1 ? path.slice(i) : path;
    }
    if (path.startsWith("/")) return path;
    return `/api/storage/generated/${path}`;
}

export function initialsOf(name?: string | null) {
    const clean = (name || "").trim();
    if (!clean) return "—";
    return clean.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function LeadThumb({
    src,
    name,
    size = 44,
    variant = "square",
    className = "",
}: {
    src?: string | null;
    name?: string | null;
    size?: number | "fill";
    variant?: "square" | "round";
    className?: string;
}) {
    const url = leadImageSrc(src);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const failed = failedUrl !== null && failedUrl === url;

    // Si la imagen ya falló antes de hidratar, onError no se dispara: lo comprobamos al montar.
    const imgRef = useCallback(
        (img: HTMLImageElement | null) => {
            if (img && img.complete && img.naturalWidth === 0) setFailedUrl(url);
        },
        [url]
    );

    const fill = size === "fill";
    const px = fill ? undefined : size;
    const showImg = url && !failed;
    // Tono estable por nombre para que el fallback no sea un muro del mismo azul.
    const tone = Array.from(name || "").reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4;

    return (
        <span
            className={`lead-thumb lead-thumb-${variant}${fill ? " lead-thumb-fill" : ""}${showImg ? "" : ` lead-thumb-empty lead-thumb-tone-${tone}`} ${className}`}
            style={px ? { width: px, height: px, fontSize: Math.max(11, Math.round(px * 0.32)) } : undefined}
        >
            {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img ref={imgRef} src={url} alt={name ? `Simulación de ${name}` : "Simulación"} loading="lazy" decoding="async" onError={() => setFailedUrl(url)} />
            ) : (
                <span aria-hidden="true">{initialsOf(name)}</span>
            )}
        </span>
    );
}
