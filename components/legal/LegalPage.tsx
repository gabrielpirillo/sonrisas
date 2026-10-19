import Link from "next/link";
import { Wordmark } from "@/components/admin/qoves/LogoMark";

/** Plantilla sobria para las páginas legales (términos y privacidad). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
    return (
        <div style={{ minHeight: "100dvh", background: "#fff", color: "var(--ink)" }}>
            <header style={{ borderBottom: "1px solid var(--line)" }}>
                <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link href="/" aria-label="Smile Fast — inicio"><Wordmark height={20} /></Link>
                    <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Actualizado: {updated}</span>
                </div>
            </header>
            <main className="sf-legal" style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px", fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)" }}>
                <h1 style={{ fontSize: "clamp(32px, 5vw, 44px)", letterSpacing: "-0.04em", lineHeight: 1.05, fontWeight: 600, color: "var(--ink)", margin: "0 0 28px" }}>{title}</h1>
                {children}
            </main>
        </div>
    );
}
