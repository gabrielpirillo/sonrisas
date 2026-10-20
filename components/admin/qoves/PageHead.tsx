import type { ReactNode } from "react";

/* Cabecera de página estándar: etiqueta mono opcional, titular bicolor
   (como la landing: parte en ink + `accent` en azul) y controles a la derecha. */
export function PageHead({
    title,
    accent,
    eyebrow,
    subtitle,
    children,
    action,
}: {
    title: string;
    accent?: string;
    eyebrow?: string;
    subtitle?: string;
    children?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="page-head">
            <div style={{ minWidth: 0 }}>
                {eyebrow && (
                    <span className="mono page-eyebrow">{eyebrow}</span>
                )}
                <h1 className="display page-title">
                    {title}
                    {accent && <> <span className="dim">{accent}</span></>}
                </h1>
                {subtitle && <p className="lead" style={{ fontSize: 15.5, marginTop: 10 }}>{subtitle}</p>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {children}
                {action}
            </div>
        </div>
    );
}

/** Campo con etiqueta mono. Es un <label>: tocar el texto enfoca el campo. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label style={{ display: "block" }}>
            <span className="mono" style={{ display: "block", fontSize: 9, marginBottom: 7 }}>{label}</span>
            {children}
        </label>
    );
}
