import { MembersManager } from "@/components/admin/MembersManager";
import { getSession } from "@/lib/auth/session";
import { isImpersonating, getAuthContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowRight, Building2, Coins, Palette, Users } from "lucide-react";
import { PageHead } from "@/components/admin/qoves/PageHead";
import { getWidgetConfigByClinicId } from "@/lib/widgetConfig.server";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/widgetConfig";
import "@/components/admin/widget-studio/widget-studio.css";

export default async function SettingsPage() {
    const session = await getSession();
    if (!session) redirect("/acceso");
    if (await isImpersonating()) redirect("/administracion/dashboard");
    if (session.role !== "admin") redirect("/administracion/leads");

    const clinic = (await getAuthContext())?.clinic ?? null;

    // Real usage — generations in the last 30 days
    let usage30 = 0;
    try {
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
        const clinicId = clinic?.id ?? '00000000-0000-0000-0000-000000000000';
        const row = await db.queryOne(
            "SELECT COUNT(*) as count FROM generations g JOIN leads l ON l.id = g.lead_id WHERE l.clinic_id = $2 AND g.created_at >= $1",
            [since, clinicId]
        );
        usage30 = parseInt(row?.count || "0");
    } catch (e) {
        console.error("[settings] usage query failed:", e);
    }

    // Resumen del widget (la edición vive en Administración › Widget)
    let widget: Awaited<ReturnType<typeof getWidgetConfigByClinicId>> = null;
    if (clinic) {
        try {
            widget = await getWidgetConfigByClinicId(clinic.id);
        } catch (e) {
            console.error("[settings] widget config failed:", e);
        }
    }
    const accent = widget?.config.brand.accent ?? "#4f6b7f";
    const widgetName = widget?.config.brand.displayName || clinic?.name || "Tu clínica";
    const customized = Boolean(widget) && JSON.stringify(widget!.config) !== JSON.stringify(DEFAULT_WIDGET_CONFIG);

    return (
        <div className="admin-page">
            <PageHead eyebrow="CUENTA" title="Configuración" accent="de la clínica" subtitle="Tu clínica, tu equipo y el acceso al widget." />

            <div className="config-grid">
                {/* ── Left column ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    <div className="card card-navy ws-link-card">
                        <span aria-hidden style={{ position: "absolute", right: -80, top: -90, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(185,207,221,0.22), transparent 65%)", pointerEvents: "none" }} />
                        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
                            <span className="mono" style={{ fontSize: 9 }}>WIDGET DE SIMULACIÓN</span>
                            <div>
                                <h3 style={{ fontSize: 21, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 6px" }}>Personaliza e instala tu widget</h3>
                                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                                    Logo, colores, textos, WhatsApp y el código para tu web, con vista previa en vivo. Los cambios se publican al guardar, sin tocar el código.
                                </p>
                            </div>
                            <div className="ws-link-preview">
                                <span className="ws-link-swatch" style={{ background: accent }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{widgetName}</div>
                                    <div className="mono" style={{ fontSize: 8.5, marginTop: 4 }}>{customized ? "PERSONALIZADO" : "CONFIGURACIÓN ORIGINAL"} · {accent.toUpperCase()}</div>
                                </div>
                            </div>
                            <Link href="/administracion/widget" className="btn btn-light btn-sm" style={{ alignSelf: "flex-start" }}>
                                <Palette size={16} aria-hidden />
                                Abrir el editor del widget
                                <ArrowRight size={15} aria-hidden />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* ── Right column ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    {/* Clínica + uso */}
                    <div className="card card-navy" style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                            <span className="mono" style={{ fontSize: 9.5 }}>TU CLÍNICA</span>
                            <span className="sf-cost-chip" style={{ padding: "5px 10px", fontSize: 12 }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: clinic?.status === "suspended" ? "var(--danger)" : "var(--scan)", boxShadow: clinic?.status === "suspended" ? "none" : "0 0 8px var(--scan)" }} />
                                {clinic?.status === "suspended" ? "Suspendida" : "Activa"}
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 22px" }}>
                            <span style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.16)", color: "var(--blue-light)", flexShrink: 0 }}>
                                <Building2 size={20} />
                            </span>
                            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15 }}>{clinic?.name ?? "Sin clínica activa"}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            <div style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                                <span className="mono" style={{ fontSize: 8.5 }}>USO · 30 DÍAS</span>
                                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 10 }}>{usage30}</div>
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 6 }}>generaciones</div>
                            </div>
                            <Link href="/administracion/creditos" className="sf-navy-tile" style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none", display: "block" }}>
                                <span className="mono" style={{ fontSize: 8.5, display: "flex", justifyContent: "space-between" }}>SALDO <Coins size={12} /></span>
                                <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 10 }}>{clinic?.credit_balance ?? 0}</div>
                                <div style={{ fontSize: 12, color: "var(--blue-light)", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>Recargar <ArrowRight size={12} /></div>
                            </Link>
                        </div>
                    </div>

                    {/* Equipo */}
                    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                        <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--blue-soft)", color: "var(--blue-deep)" }}>
                                <Users size={18} />
                            </span>
                            <div>
                                <span className="mono" style={{ fontSize: 9, color: "var(--blue-deep)" }}>EQUIPO</span>
                                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", margin: "3px 0 0" }}>Miembros <span style={{ color: "var(--ink-3)" }}>e invitaciones</span></h3>
                            </div>
                        </div>
                        <div style={{ padding: "18px 22px 22px" }}>
                            <MembersManager />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
