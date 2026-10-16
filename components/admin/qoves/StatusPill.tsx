/* Sober status pill — dot + label, Qoves language.
   Replaces the saturated 4-color badges. */

export const LEAD_STATUS: Record<string, { label: string; dot: string }> = {
    pending: { label: "Pendiente", dot: "#b6a98f" },
    contacted: { label: "Contactado", dot: "#7b93b0" },
    converted: { label: "Convertido", dot: "#5f917b" },
    rejected: { label: "Rechazado", dot: "#bd8b86" },
};

export function StatusPill({ status }: { status: string }) {
    const s = LEAD_STATUS[status] || LEAD_STATUS.pending;
    return (
        <span className="status-pill">
            <span className="status-dot" style={{ background: s.dot }} />
            {s.label}
        </span>
    );
}
