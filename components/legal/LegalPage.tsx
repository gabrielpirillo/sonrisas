import Link from "next/link";
import { Wordmark } from "@/components/admin/qoves/LogoMark";

const footLink = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 44,
    color: "var(--ink-2)",
    textDecoration: "none",
    fontSize: 14.5,
} as const;

/** Plantilla sobria para las páginas legales (términos y privacidad). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
    return (
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#fff", color: "var(--ink)" }}>
            <header style={{ borderBottom: "1px solid var(--line)" }}>
                <div style={{ maxWidth: 760, margin: "0 auto", padding: "10px 20px", minHeight: 64, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Link href="/" aria-label="Smile Fast — inicio" style={{ display: "inline-flex", alignItems: "center", minHeight: 44 }}><Wordmark height={20} /></Link>
                    <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Actualizado: {updated}</span>
                </div>
            </header>
            <main className="sf-legal" style={{ flex: 1, width: "100%", maxWidth: 760, margin: "0 auto", padding: "40px 20px 64px", fontSize: 16, lineHeight: 1.7, color: "var(--ink-2)", overflowWrap: "break-word" }}>
                <h1 style={{ fontSize: "clamp(30px, 8vw, 44px)", letterSpacing: "-0.04em", lineHeight: 1.05, fontWeight: 600, color: "var(--ink)", margin: "0 0 24px", textWrap: "balance" }}>{title}</h1>
                {children}
            </main>
            <footer style={{ borderTop: "1px solid var(--line)", background: "var(--blue-tint, #f2f6f9)" }}>
                <nav aria-label="Legal" style={{ maxWidth: 760, margin: "0 auto", padding: "8px 20px", display: "flex", flexWrap: "wrap", gap: "0 22px" }}>
                    <Link href="/" style={footLink}>Volver al inicio</Link>
                    <Link href="/terminos" style={footLink}>Términos de uso</Link>
                    <Link href="/privacidad" style={footLink}>Privacidad</Link>
                </nav>
            </footer>
        </div>
    );
}
