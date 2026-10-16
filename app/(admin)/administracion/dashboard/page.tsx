import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getAuthContext } from '@/lib/auth/context';
import { redirect } from "next/navigation";
import { PageHead } from "@/components/admin/qoves/PageHead";
import { KpiCard } from "@/components/admin/qoves/KpiCard";
import { AreaTrend } from "@/components/admin/qoves/AreaTrend";
import { StatusPill } from "@/components/admin/qoves/StatusPill";
import { ExportGenerationsCsv } from "@/components/admin/qoves/ExportGenerationsCsv";

const DAY = 86_400_000;

/** % change between two periods, formatted for the KPI delta. */
function delta(current: number, prior: number): { label: string; up: boolean } {
    if (prior === 0) {
        if (current === 0) return { label: "0%", up: true };
        return { label: "100%", up: true };
    }
    const pct = Math.round(((current - prior) / prior) * 100);
    return { label: `${Math.abs(pct)}%`, up: pct >= 0 };
}

/** Bucket day-offsets (0 = today) into `bins` columns spanning `days` back. */
function sparkline(offsets: number[], days = 24, bins = 8): number[] {
    const out = new Array(bins).fill(0);
    const span = days / bins;
    for (const off of offsets) {
        if (off < 0 || off >= days) continue;
        const idx = Math.min(bins - 1, Math.floor((days - 1 - off) / span));
        out[idx]++;
    }
    return out;
}

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect("/acceso");
    const ctx = await getAuthContext();
    const impersonating = Boolean(ctx?.impersonatedBy);
    // Todo se filtra por la clínica activa (sin clínica no se muestra nada).
    const clinicId = ctx?.clinic?.id ?? '00000000-0000-0000-0000-000000000000';

    if (session.role !== 'admin' && session.role !== 'basic') {
        return (
            <div className="admin-page" style={{ alignItems: "center", textAlign: "center", paddingTop: 120 }}>
                <h2 className="display" style={{ fontSize: 28 }}>Acceso no autorizado</h2>
                <p className="lead" style={{ maxWidth: 460 }}>
                    Tu cuenta no tiene los permisos necesarios para acceder al panel de administración.
                </p>
                <form action="/auth/logout" method="post" style={{ marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary btn-sm">Cerrar sesión</button>
                </form>
            </div>
        );
    }

    // ── All-time totals ──────────────────────────────────────────────
    const [totalLeadsRow, smileRow, videoRow, convertedRow] = await Promise.all([
        db.queryOne('SELECT COUNT(*) as count FROM leads WHERE clinic_id = $1', [clinicId]),
        db.queryOne("SELECT COUNT(*) as count FROM generations g JOIN leads l ON l.id = g.lead_id WHERE l.clinic_id = $1 AND g.type = 'image'", [clinicId]),
        db.queryOne("SELECT COUNT(*) as count FROM generations g JOIN leads l ON l.id = g.lead_id WHERE l.clinic_id = $1 AND g.type = 'video'", [clinicId]),
        db.queryOne("SELECT COUNT(*) as count FROM leads WHERE clinic_id = $1 AND status = 'converted'", [clinicId]),
    ]);
    const totalLeads = parseInt(totalLeadsRow?.count || '0');
    const smileGenerations = parseInt(smileRow?.count || '0');
    const videoRequests = parseInt(videoRow?.count || '0');
    const converted = parseInt(convertedRow?.count || '0');
    const conversion = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

    // ── 60-day windows for trends / sparklines ───────────────────────
    const now = Date.now();
    const sixtyDaysAgo = new Date(now - 60 * DAY).toISOString();

    const [gensResult, leadsResult] = await Promise.all([
        db.query(`SELECT g.created_at, g.type FROM generations g JOIN leads l ON l.id = g.lead_id
                  WHERE l.clinic_id = $2 AND g.created_at >= $1 ORDER BY g.created_at ASC`, [sixtyDaysAgo, clinicId]),
        db.query(`SELECT created_at, status FROM leads WHERE clinic_id = $2 AND created_at >= $1 ORDER BY created_at ASC`, [sixtyDaysAgo, clinicId]),
    ]);

    const gens = gensResult.rows as { created_at: string; type: string }[];
    const leadRows = leadsResult.rows as { created_at: string; status: string }[];
    const offsetOf = (iso: string) => Math.floor((now - new Date(iso).getTime()) / DAY);

    const inLast30 = (off: number) => off >= 0 && off < 30;
    const inPrior30 = (off: number) => off >= 30 && off < 60;

    const leadOffsets = leadRows.map((r) => offsetOf(r.created_at));
    const imgOffsets = gens.filter((g) => g.type === 'image').map((g) => offsetOf(g.created_at));
    const vidOffsets = gens.filter((g) => g.type === 'video').map((g) => offsetOf(g.created_at));
    const convOffsets = leadRows.filter((r) => r.status === 'converted').map((r) => offsetOf(r.created_at));

    const count = (arr: number[], pred: (o: number) => boolean) => arr.filter(pred).length;

    const leadsDelta = delta(count(leadOffsets, inLast30), count(leadOffsets, inPrior30));
    const simDelta = delta(count(imgOffsets, inLast30), count(imgOffsets, inPrior30));
    const vidDelta = delta(count(vidOffsets, inLast30), count(vidOffsets, inPrior30));

    const convRateLast30 = count(leadOffsets, inLast30) > 0 ? count(convOffsets, inLast30) / count(leadOffsets, inLast30) : 0;
    const convRatePrior30 = count(leadOffsets, inPrior30) > 0 ? count(convOffsets, inPrior30) / count(leadOffsets, inPrior30) : 0;
    const convDelta = delta(Math.round(convRateLast30 * 100), Math.round(convRatePrior30 * 100));

    const dailyGen = new Array(30).fill(0);
    for (const g of gens) {
        const off = offsetOf(g.created_at);
        if (off >= 0 && off < 30) dailyGen[29 - off]++;
    }

    // ── Recent activity ──────────────────────────────────────────────
    const activityResult = await db.query(
        `SELECT
            l.id, l.name, l.email, l.created_at, l.status,
            COUNT(g.id) FILTER (WHERE g.type = 'image' AND g.status = 'completed') as smile_count,
            COUNT(g.id) FILTER (WHERE g.type = 'video' AND g.status = 'completed') as video_count
         FROM leads l
         LEFT JOIN generations g ON g.lead_id = l.id
         WHERE l.clinic_id = $1
         GROUP BY l.id, l.name, l.email, l.created_at, l.status
         ORDER BY l.created_at DESC
         LIMIT 6`,
        [clinicId]
    );
    const recentActivity = activityResult.rows as any[];

    const initials = (name?: string) =>
        (name || "—").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

    return (
        <div className="admin-page">
            <PageHead title="Resumen" subtitle="Tu actividad de los últimos 30 días" action={!impersonating ? <ExportGenerationsCsv /> : undefined}>
                <span className="mono seg-now">ÚLTIMOS 30 DÍAS</span>
            </PageHead>

            <div className="kpi-grid">
                <KpiCard label="LEADS TOTALES" value={totalLeads} delta={leadsDelta.label} up={leadsDelta.up} spark={sparkline(leadOffsets)} index={0} />
                <KpiCard label="SIMULACIONES" value={smileGenerations} delta={simDelta.label} up={simDelta.up} spark={sparkline(imgOffsets)} index={1} />
                <KpiCard label="VÍDEOS SOLICITADOS" value={videoRequests} delta={vidDelta.label} up={vidDelta.up} spark={sparkline(vidOffsets)} index={2} />
                <KpiCard label="CONVERSIÓN A CITA" value={conversion} suffix="%" delta={convDelta.label} up={convDelta.up} spark={sparkline(convOffsets)} index={3} />
            </div>

            <div className="dash-split">
                <AreaTrend daily={dailyGen} />

                <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Actividad reciente</h3>
                        <span className="mono" style={{ fontSize: 9 }}>EN VIVO</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        {recentActivity.length > 0 ? (
                            recentActivity.map((l, i) => {
                                const smiles = parseInt(l.smile_count || '0');
                                const videos = parseInt(l.video_count || '0');
                                return (
                                    <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 22px", borderTop: i ? "1px solid var(--line)" : "none" }}>
                                        <span className="avatar">{initials(l.name)}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {l.name || "Sin nombre"}
                                            </div>
                                            <div className="mono" style={{ fontSize: 9, marginTop: 2 }}>
                                                {smiles} SIMULACIONES{videos > 0 ? " · VÍDEO" : ""}
                                            </div>
                                        </div>
                                        <StatusPill status={l.status} />
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: "32px 22px", textAlign: "center" }} className="lead">
                                No hay actividad reciente registrada.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
