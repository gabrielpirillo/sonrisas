/* Pastilla de estado del lead — escala única de marca (lib/brand.ts). */
import { LEAD_STATUS } from "@/lib/brand";

export { LEAD_STATUS };

export function StatusPill({ status }: { status: string }) {
    const s = LEAD_STATUS[status] || LEAD_STATUS.pending;
    return (
        <span className="status-pill" style={{ background: s.bg, borderColor: s.border, color: s.text }}>
            <span className="status-dot" style={{ background: s.dot, boxShadow: status === "converted" ? "0 0 8px 1px rgba(185,207,221,0.8)" : undefined }} />
            {s.label}
        </span>
    );
}
