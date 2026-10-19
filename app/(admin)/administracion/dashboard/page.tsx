import Link from "next/link";
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getAuthContext } from '@/lib/auth/context';
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, CalendarCheck, CheckCircle2, Clapperboard, ScanFace, Users } from "lucide-react";
import { KpiCard } from "@/components/admin/qoves/KpiCard";
import { AreaTrend } from "@/components/admin/qoves/AreaTrend";
import { StatusPill } from "@/components/admin/qoves/StatusPill";
import { LeadThumb } from "@/components/admin/qoves/LeadThumb";
import { BeforeAfterHero } from "@/components/admin/qoves/BeforeAfterHero";
import { ExportGenerationsCsv } from "@/components/admin/qoves/ExportGenerationsCsv";

const DAY = 86_400_000;

const GOAL_LABELS: Record<string, string> = {
    alignment: "Alineación",
    veneers: "Carillas",
    implants: "Implantes",
    full_smile: "Sonrisa completa",
    whitening: "Blanqueamiento",
};

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

/** "hace 3 h", "hace 2 d"… */
function timeAgo(iso: string, now: number): string {
    const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} d`;
    return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

type LeadCard = {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    created_at: string;
    status: string;
    survey_data: { improvementGoal?: string } | null;
    smile_count: string;
    video_count: string;
    thumb: string | null;
};

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
    const isAdmin = session.role === 'admin';

    // ── All-time totals ──────────────────────────────────────────────
    const [totalLeadsRow, smileRow, videoRow, convertedRow, pendingRow] = await Promise.all([
        db.queryOne('SELECT COUNT(*) as count FROM leads WHERE clinic_id = $1', [clinicId]),
        db.queryOne("SELECT COUNT(*) as count FROM generations g JOIN leads l ON l.id = g.lead_id WHERE l.clinic_id = $1 AND g.type = 'image'", [clinicId]),
        db.queryOne("SELECT COUNT(*) as count FROM leads WHERE clinic_id = $1 AND video_requested_at IS NOT NULL", [clinicId]),
        db.queryOne("SELECT COUNT(*) as count FROM leads WHERE clinic_id = $1 AND status = 'converted'", [clinicId]),
        db.queryOne("SELECT COUNT(*) as count FROM leads WHERE clinic_id = $1 AND status = 'pending'", [clinicId]),
    ]);
    const totalLeads = parseInt(totalLeadsRow?.count || '0');
    const smileGenerations = parseInt(smileRow?.count || '0');
    const videoRequests = parseInt(videoRow?.count || '0');
    const converted = parseInt(convertedRow?.count || '0');
    const pendingCount = parseInt(pendingRow?.count || '0');
    const conversion = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

    // ── 60-day windows for trends / sparklines ───────────────────────
    const now = Date.now();
    const sixtyDaysAgo = new Date(now - 60 * DAY).toISOString();

    const [gensResult, leadsResult] = await Promise.all([
        db.query(`SELECT g.created_at, g.type FROM generations g JOIN leads l ON l.id = g.lead_id
                  WHERE l.clinic_id = $2 AND g.created_at >= $1 ORDER BY g.created_at ASC`, [sixtyDaysAgo, clinicId]),
        db.query(`SELECT created_at, status, video_requested_at FROM leads WHERE clinic_id = $2 AND created_at >= $1 ORDER BY created_at ASC`, [sixtyDaysAgo, clinicId]),
    ]);

    const gens = gensResult.rows as { created_at: string; type: string }[];
    const leadRows = leadsResult.rows as { created_at: string; status: string; video_requested_at: string | null }[];
    const offsetOf = (iso: string) => Math.floor((now - new Date(iso).getTime()) / DAY);

    const inLast30 = (off: number) => off >= 0 && off < 30;
    const inPrior30 = (off: number) => off >= 30 && off < 60;

    const leadOffsets = leadRows.map((r) => offsetOf(r.created_at));
    const imgOffsets = gens.filter((g) => g.type === 'image').map((g) => offsetOf(g.created_at));
    const vidOffsets = leadRows.filter((r) => r.video_requested_at).map((r) => offsetOf(r.video_requested_at as string));
    const convOffsets = leadRows.filter((r) => r.status === 'converted').map((r) => offsetOf(r.created_at));

    const count = (arr: number[], pred: (o: number) => boolean) => arr.filter(pred).length;

    const leadsThisWeek = count(leadOffsets, (o) => o >= 0 && o < 7);
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

    // ── Recent leads (con la última sonrisa simulada) + cola de pendientes ──
    const leadCardSql = (where: string, limit: number) => `SELECT
            l.id, l.name, l.email, l.phone, l.created_at, l.status, l.survey_data,
            COUNT(g.id) FILTER (WHERE g.type = 'image' AND g.status = 'completed') as smile_count,
            COUNT(g.id) FILTER (WHERE g.type = 'video' AND g.status = 'completed') as video_count,
            (SELECT g2.output_path FROM generations g2
               WHERE g2.lead_id = l.id AND g2.type = 'image' AND g2.status = 'completed' AND g2.output_path IS NOT NULL
               ORDER BY g2.created_at DESC LIMIT 1) as thumb
         FROM leads l
         LEFT JOIN generations g ON g.lead_id = l.id
         WHERE l.clinic_id = $1 ${where}
         GROUP BY l.id
         ORDER BY l.created_at DESC
         LIMIT ${limit}`;

    const [activityResult, queueResult] = await Promise.all([
        db.query(leadCardSql('', 6), [clinicId]),
        db.query(leadCardSql("AND l.status = 'pending'", 5), [clinicId]),
    ]);
    const recentActivity = activityResult.rows as LeadCard[];
    const queue = queueResult.rows as LeadCard[];

    const clinicName = ctx?.clinic?.name ?? "tu clínica";
    const credits = ctx?.clinic?.credit_balance;
    const goalOf = (l: LeadCard) => {
        const g = l.survey_data?.improvementGoal;
        return g ? GOAL_LABELS[g] || g : null;
    };

    // ── Hero: la cifra que importa hoy ───────────────────────────────
    const hero =
        totalLeads === 0
            ? {
                  number: null as number | null,
                  title: "Tu widget está listo para recibir pacientes",
                  copy: "Cuando un visitante de tu web pruebe la simulación y deje su contacto, aparecerá aquí con su nueva sonrisa.",
                  cta: isAdmin && !impersonating
                      ? { href: "/administracion/settings", label: "Instalar el widget" }
                      : { href: "/administracion/leads", label: "Ir a leads" },
              }
            : pendingCount > 0
              ? {
                    number: pendingCount,
                    title: pendingCount === 1 ? "paciente espera tu llamada" : "pacientes esperan tu llamada",
                    copy: "Ya vieron su nueva sonrisa y dejaron su contacto. Llámalos mientras el interés está fresco.",
                    cta: { href: "/administracion/leads?estado=pending", label: "Ver pendientes" },
                }
              : {
                    number: leadsThisWeek,
                    title: leadsThisWeek === 1 ? "lead nuevo esta semana" : "leads nuevos esta semana",
                    copy: "Estás al día: no queda ningún paciente pendiente de contactar.",
                    cta: { href: "/administracion/leads", label: "Ver todos los leads" },
                };

    return (
        <div className="admin-page">
            {/* ── Banda navy: hoy ─────────────────────────────────── */}
            <section className="dash-hero" aria-labelledby="dash-hero-title">
                <div className="dash-hero-body">
                    <span className="mono dash-hero-eyebrow">Panel · {clinicName}</span>
                    <h1 id="dash-hero-title" className="dash-hero-title">
                        {hero.number !== null && <span className="dash-hero-num">{hero.number}</span>}
                        <span className="dash-hero-text">{hero.title}</span>
                    </h1>
                    <p className="dash-hero-copy">{hero.copy}</p>
                    <div className="dash-hero-actions">
                        <Link href={hero.cta.href} className="btn btn-light btn-sm">
                            {hero.cta.label} <ArrowRight size={16} strokeWidth={2} />
                        </Link>
                        {!impersonating && totalLeads > 0 && <ExportGenerationsCsv />}
                    </div>
                    <dl className="dash-hero-meta">
                        <div>
                            <dt>Nuevos · 7 días</dt>
                            <dd>{leadsThisWeek}</dd>
                        </div>
                        <div>
                            <dt>Simulaciones</dt>
                            <dd>{smileGenerations}</dd>
                        </div>
                        {typeof credits === "number" && (
                            <div>
                                <dt>Créditos</dt>
                                <dd>
                                    {isAdmin && !impersonating ? (
                                        <Link href="/administracion/creditos" className="dash-hero-meta-link">
                                            {credits} <ArrowUpRight size={14} strokeWidth={2} />
                                        </Link>
                                    ) : credits}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
                <BeforeAfterHero />
            </section>

            {/* ── KPIs ─────────────────────────────────────────────── */}
            <div className="kpi-grid">
                <KpiCard label="LEADS TOTALES" icon={<Users size={17} strokeWidth={1.7} />} value={totalLeads} delta={leadsDelta.label} up={leadsDelta.up} spark={sparkline(leadOffsets)} index={0} />
                <KpiCard label="SIMULACIONES" icon={<ScanFace size={17} strokeWidth={1.7} />} value={smileGenerations} delta={simDelta.label} up={simDelta.up} spark={sparkline(imgOffsets)} index={1} />
                <KpiCard label="VÍDEOS SOLICITADOS" icon={<Clapperboard size={17} strokeWidth={1.7} />} value={videoRequests} delta={vidDelta.label} up={vidDelta.up} spark={sparkline(vidOffsets)} index={2} />
                <KpiCard label="CONVERSIÓN A CITA" icon={<CalendarCheck size={17} strokeWidth={1.7} />} tone="navy" value={conversion} suffix="%" delta={convDelta.label} up={convDelta.up} spark={sparkline(convOffsets)} index={3} />
            </div>

            {totalLeads === 0 ? (
                <section className="card install-card" aria-labelledby="install-title">
                    <div className="install-body">
                        <span className="mono" style={{ fontSize: 9.5, color: "var(--blue-deep)" }}>Primer paso</span>
                        <h2 id="install-title" className="install-title">Pon el simulador en tu web y empieza a recibir pacientes</h2>
                        <p className="lead" style={{ fontSize: 15 }}>
                            Copia el código del widget en tu página. Cada visitante que vea su nueva sonrisa te deja su contacto en este panel.
                        </p>
                        {isAdmin && !impersonating ? (
                            <Link href="/administracion/settings" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
                                Instalar el widget <ArrowRight size={16} strokeWidth={2} />
                            </Link>
                        ) : (
                            <p className="mono" style={{ fontSize: 9.5 }}>Pide al administrador de la clínica que instale el widget</p>
                        )}
                    </div>
                    <div className="install-photo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/panel/trans-2-after.jpg" alt="" loading="lazy" />
                    </div>
                </section>
            ) : null}

            <div className={totalLeads > 0 ? "dash-split" : undefined}>
                <AreaTrend daily={dailyGen} />

                {totalLeads > 0 && (
                    <section className="card queue-card" aria-labelledby="queue-title">
                        <header className="queue-head">
                            <div>
                                <span className="mono" style={{ fontSize: 9.5, color: "var(--blue-deep)" }}>Cola de llamadas</span>
                                <h3 id="queue-title" className="section-title">Pendientes de contactar</h3>
                            </div>
                            <span className="queue-count" aria-label={`${pendingCount} pendientes`}>{pendingCount}</span>
                        </header>
                        {queue.length > 0 ? (
                            <ul className="queue-list">
                                {queue.map((l) => {
                                    const goal = goalOf(l);
                                    return (
                                        <li key={l.id}>
                                            <Link href={`/administracion/leads?lead=${l.id}`} className="queue-item">
                                                <LeadThumb src={l.thumb} name={l.name} size={46} />
                                                <span className="queue-main">
                                                    <span className="queue-name">{l.name || "Sin nombre"}</span>
                                                    <span className="queue-meta">
                                                        {goal ? `${goal} · ` : ""}{timeAgo(l.created_at, now)}
                                                    </span>
                                                </span>
                                                <span className="queue-go" aria-hidden="true"><ArrowRight size={16} strokeWidth={2} /></span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="queue-empty">
                                <CheckCircle2 size={26} strokeWidth={1.6} />
                                <strong>Estás al día</strong>
                                <span>No hay pacientes pendientes de contactar.</span>
                            </div>
                        )}
                        {pendingCount > queue.length && (
                            <Link href="/administracion/leads?estado=pending" className="queue-foot">
                                Ver los {pendingCount} pendientes <ArrowRight size={14} strokeWidth={2} />
                            </Link>
                        )}
                    </section>
                )}
            </div>

            {/* ── Simulaciones recientes ──────────────────────────── */}
            {recentActivity.length > 0 && (
                <section aria-labelledby="recent-title" className="recent-section">
                    <div className="recent-head">
                        <div>
                            <span className="mono" style={{ fontSize: 9.5, color: "var(--blue-deep)" }}>Últimos pacientes</span>
                            <h3 id="recent-title" className="section-title">Sonrisas simuladas recientemente</h3>
                        </div>
                        <Link href="/administracion/leads" className="text-link">
                            Ver todos los leads <ArrowRight size={14} strokeWidth={2} />
                        </Link>
                    </div>
                    <ul className="recent-grid">
                        {recentActivity.map((l) => {
                            const smiles = parseInt(l.smile_count || '0');
                            const videos = parseInt(l.video_count || '0');
                            const goal = goalOf(l);
                            return (
                                <li key={l.id}>
                                    <Link href={`/administracion/leads?lead=${l.id}`} className="recent-card">
                                        <span className="recent-photo">
                                            <LeadThumb src={l.thumb} name={l.name} size="fill" />
                                            <span className="recent-status"><StatusPill status={l.status} /></span>
                                        </span>
                                        <span className="recent-info">
                                            <span className="recent-name">{l.name || "Sin nombre"}</span>
                                            <span className="recent-meta">
                                                {goal ?? `${smiles} ${smiles === 1 ? "simulación" : "simulaciones"}`}
                                                {videos > 0 ? " · vídeo" : ""}
                                            </span>
                                            <span className="mono recent-time">{timeAgo(l.created_at, now)}</span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}
        </div>
    );
}
