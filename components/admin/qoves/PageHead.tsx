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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div>
                {eyebrow && (
                    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 9.5, color: "var(--blue-deep)", padding: "6px 12px", borderRadius: 99, border: "1px solid var(--blue-line)", background: "rgba(255,255,255,0.7)", marginBottom: 14 }}>
                        {eyebrow}
                    </span>
                )}
                <h1 className="display" style={{ fontSize: 38 }}>
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

export function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <div className="mono" style={{ fontSize: 9, marginBottom: 7 }}>{label}</div>
            {children}
        </div>
    );
}
