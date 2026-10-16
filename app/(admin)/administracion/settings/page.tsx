import { MembersManager } from "@/components/admin/MembersManager";
import { getSession } from "@/lib/auth/session";
import { isImpersonating, getAuthContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHead, Field } from "@/components/admin/qoves/PageHead";
import { EmbedCard } from "@/components/admin/qoves/EmbedCard";

const ACCENTS = ["#1c1e1d", "#7e8c86", "#7b93b0", "#5f917b"];

export default async function SettingsPage() {
    const session = await getSession();
    if (!session) redirect("/acceso");
    if (await isImpersonating()) redirect("/administracion/dashboard");
    if (session.role !== "admin") redirect("/administracion/leads");

    // Real usage — generations in the last 30 days
    let usage30 = 0;
    try {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const clinicId = (await getAuthContext())?.clinic?.id ?? '00000000-0000-0000-0000-000000000000';
        const row = await db.queryOne(
            "SELECT COUNT(*) as count FROM generations g JOIN leads l ON l.id = g.lead_id WHERE l.clinic_id = $2 AND g.created_at >= $1",
            [since, clinicId]
        );
        usage30 = parseInt(row?.count || "0");
    } catch (e) {
        console.error("[settings] usage query failed:", e);
    }

    return (
        <div className="admin-page">
            <PageHead title="Configuración" subtitle="Tu widget, tu marca y tu equipo" />

            <div className="config-grid">
                {/* ── Left column ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    <EmbedCard widgetKey={(await getAuthContext())?.clinic?.public_widget_key ?? null} />

                    {/* Marca */}
                    <div className="card" style={{ padding: 24 }}>
                        <span className="mono" style={{ fontSize: 9 }}>MARCA DE LA CLÍNICA</span>
                        <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", margin: "10px 0 18px" }}>Personaliza tu widget</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <Field label="DOMINIO">
                                <input className="field" defaultValue="dentalcorbella.com" style={{ height: 44, fontSize: 14 }} />
                            </Field>
                            <Field label="COLOR DE ACENTO">
                                <div style={{ display: "flex", gap: 8, alignItems: "center", height: 44 }}>
                                    {ACCENTS.map((c, i) => (
                                        <span
                                            key={c}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 8,
                                                background: c,
                                                border: i === 0 ? "2px solid var(--ink)" : "1px solid var(--line)",
                                                boxShadow: i === 0 ? "0 0 0 2px #fff inset" : "none",
                                            }}
                                        />
                                    ))}
                                </div>
                            </Field>
                        </div>
                    </div>
                </div>

                {/* ── Right column ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    {/* Uso */}
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span className="mono" style={{ fontSize: 9 }}>USO · ÚLTIMOS 30 DÍAS</span>
                            <span className="mono" style={{ fontSize: 9 }}>GENERACIONES</span>
                        </div>
                        <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 14 }}>{usage30}</div>
                        <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 12 }}>
                            Simulaciones y vídeos generados por tus visitantes este periodo.
                        </div>
                    </div>

                    {/* Equipo */}
                    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--line)" }}>
                            <span className="mono" style={{ fontSize: 9 }}>EQUIPO</span>
                            <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", margin: "6px 0 0" }}>Miembros</h3>
                        </div>
                        <div style={{ padding: "18px 22px" }}>
                            <MembersManager />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
