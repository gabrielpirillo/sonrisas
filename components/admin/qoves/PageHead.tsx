import type { ReactNode } from "react";

/* Standard page header — display title + lead subtitle, optional
   right-aligned controls. Qoves admin language. */
export function PageHead({
    title,
    subtitle,
    children,
    action,
}: {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
            <div>
                <h1 className="display" style={{ fontSize: 34 }}>{title}</h1>
                {subtitle && <p className="lead" style={{ fontSize: 15, marginTop: 8 }}>{subtitle}</p>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
