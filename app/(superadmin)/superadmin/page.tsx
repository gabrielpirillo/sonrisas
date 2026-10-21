import Link from 'next/link';
import { ChevronRight, Download } from 'lucide-react';
import { getPlatformOverview, getClinicsList, getUsageSeries } from '@/lib/platform/queries';
import { UsageChart } from '@/components/platform/UsageChart';
import { planLabel, plural } from '@/components/platform/labels';
import { PageHead } from '@/components/admin/qoves/PageHead';
import { StatCard } from '@/components/admin/qoves/StatCard';
import { C, CLINIC_STATUS, SERIES } from '@/lib/brand';
import { formatMoney, minorDigits } from '@/components/panel/credits/format';

export const dynamic = 'force-dynamic';

function ClinicPill({ status }: { status: string }) {
    const s = CLINIC_STATUS[status] || { label: status, dot: C.blue };
    return (
        <span className="status-pill">
            <span className="status-dot" style={{ background: s.dot }} />
            {s.label}
        </span>
    );
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default async function SuperAdminHome() {
    const [ov, clinics, usage] = await Promise.all([getPlatformOverview(), getClinicsList(), getUsageSeries()]);
    const totalPlans = ov.plans.reduce((a, p) => a + p.count, 0) || 1;

    return (
        <div className="admin-page">
            <PageHead
                eyebrow="CONSOLA DE OPERADOR"
                title="Visión"
                accent="general"
                subtitle="Toda la plataforma Smile Fast en un vistazo"
                action={
                    <a href="/superadmin/export" className="btn btn-white btn-sm" download>
                        <Download size={15} aria-hidden /> Exportar CSV
                    </a>
                }
            />

            <div className="kpi-grid sa-kpi-hero">
                {ov.revenue.length <= 1 ? (
                    <StatCard
                        label="INGRESOS (STRIPE)"
                        value={(ov.revenue[0]?.amountMinor ?? 0) / (ov.revenue[0] && minorDigits(ov.revenue[0].currency) === 0 ? 1 : 100)}
                        format={{ style: 'currency', currency: (ov.revenue[0]?.currency ?? 'usd').toUpperCase() }}
                        hint="NETO DE REEMBOLSOS"
                        index={0}
                    />
                ) : (
                    // Varias monedas: una línea por moneda, nunca sumadas entre sí.
                    <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 110 }}>
                        <span className="mono" style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 6, height: 6, borderRadius: 2, background: 'var(--blue-deep)', opacity: 0.8 }} />
                            INGRESOS (STRIPE)
                        </span>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
                            {ov.revenue.map((r) => (
                                <li key={r.currency} style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                                    {formatMoney(r.amountMinor, r.currency)}
                                </li>
                            ))}
                        </ul>
                        <span className="mono" style={{ fontSize: 9 }}>POR MONEDA · NETO DE REEMBOLSOS</span>
                    </div>
                )}
                <StatCard label="CLÍNICAS" value={ov.clinics} index={1} />
                <StatCard label="USUARIOS" value={ov.users} index={2} />
                <StatCard label="LEADS" value={ov.leads} index={3} />
                <StatCard label="SIMULACIONES" value={ov.images} index={4} />
                <StatCard label="VÍDEOS" value={ov.videos} index={5} />
                <StatCard label="CRÉDITOS EN CIRCULACIÓN" value={ov.creditsInCirculation} index={6} />
                <StatCard label="CRÉDITOS VENDIDOS" value={ov.creditsSold} index={7} />
            </div>

            <div className="dash-split">
                {/* Uso diario */}
                <div className="card sa-pad">
                    <div style={{ marginBottom: 12 }}>
                        <span className="mono sa-eyebrow">GENERACIONES · 30 DÍAS</span>
                        <h3 className="sa-h3">Uso <span className="dim">de la plataforma</span></h3>
                    </div>
                    <UsageChart data={usage} />
                </div>

                {/* Distribución de planes */}
                <div className="card sa-pad">
                    <span className="mono sa-eyebrow">{plural(ov.clinics, 'CLÍNICA', 'CLÍNICAS')}</span>
                    <h3 className="sa-h3">Distribución <span className="dim">de planes</span></h3>
                    <div style={{ marginTop: 20 }}>
                        {ov.plans.map((p, i) => {
                            const pct = Math.round((p.count / totalPlans) * 100);
                            return (
                                <div key={p.plan} className="sa-plan-row">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{planLabel(p.plan)}</span>
                                        <span className="mono sa-num" style={{ fontSize: 10 }}>{p.count} · {pct}%</span>
                                    </div>
                                    <div
                                        className="sa-plan-track"
                                        role="meter"
                                        aria-label={`Plan ${planLabel(p.plan)}`}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={pct}
                                        aria-valuetext={`${plural(p.count, 'clínica', 'clínicas')} (${pct}%)`}
                                    >
                                        <div className="sf-bar" style={{ width: `${(p.count / totalPlans) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${SERIES[i % SERIES.length]}, ${C.blueAccent})`, borderRadius: 99, animationDelay: `${0.2 + i * 0.1}s` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {ov.plans.length === 0 && <span className="lead" style={{ fontSize: 13 }}>Sin datos de planes.</span>}
                    </div>
                </div>
            </div>

            {/* Clínicas */}
            <div className="card sa-cq" style={{ overflow: 'hidden', padding: 0 }}>
                <div className="sa-card-head">
                    <h3 className="sa-card-title">Clínicas <span className="dim">de la plataforma</span></h3>
                    <span className="mono sa-count">{clinics.length} EN TOTAL</span>
                </div>

                {clinics.length === 0 ? (
                    <div className="empty-state">Sin clínicas todavía</div>
                ) : (
                    <>
                        <div className="sa-table-scroll sa-desktop-only">
                            <table className="lead-table" style={{ minWidth: 640 }}>
                                <thead>
                                    <tr><th>Clínica</th><th>Plan</th><th>Saldo</th><th>Miembros</th><th>Leads</th><th>Estado</th><th><span className="sr-only">Abrir</span></th></tr>
                                </thead>
                                <tbody>
                                    {clinics.map((c) => (
                                        <tr key={c.id}>
                                            <td>
                                                <Link href={`/superadmin/clinicas/${c.id}`} className="sa-row-link" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                                    <span className="avatar" style={{ borderRadius: 9 }}>{initials(c.name)}</span>
                                                    <span style={{ minWidth: 0 }}>
                                                        <span className="sa-row-name" style={{ display: 'block' }}>{c.name}</span>
                                                        <span className="mono" style={{ fontSize: 9 }}>{c.slug}</span>
                                                    </span>
                                                </Link>
                                            </td>
                                            <td><span className="sa-plan-chip">{planLabel(c.plan)}</span></td>
                                            <td className="sa-num" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>{c.credit_balance}</td>
                                            <td className="sa-num" style={{ fontSize: 13.5 }}>{c.members}</td>
                                            <td className="sa-num" style={{ fontSize: 13.5 }}>{c.leads}</td>
                                            <td><ClinicPill status={c.status} /></td>
                                            <td style={{ textAlign: 'right' }}><Link href={`/superadmin/clinicas/${c.id}`} className="row-go" aria-label={`Ver ${c.name}`}>Ver →</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="sa-mlist sa-mobile-only">
                            {clinics.map((c, i) => (
                                <li key={c.id} className="sa-mitem" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                                    <Link href={`/superadmin/clinicas/${c.id}`} className="sa-mlink">
                                        <span className="avatar" style={{ borderRadius: 10, width: 40, height: 40, fontSize: 12.5 }}>{initials(c.name)}</span>
                                        <span className="sa-mmain">
                                            <span className="sa-mtitle sa-mtitle-trunc">{c.name}</span>
                                            <span className="sa-mmeta">
                                                <ClinicPill status={c.status} />
                                                <span className="sa-plan-chip">{planLabel(c.plan)}</span>
                                            </span>
                                            <span className="sa-mmeta sa-num">
                                                {plural(c.credit_balance, 'crédito', 'créditos')}
                                                <span className="sa-dot-sep" aria-hidden />
                                                {plural(c.members, 'miembro', 'miembros')}
                                                <span className="sa-dot-sep" aria-hidden />
                                                {plural(c.leads, 'lead', 'leads')}
                                            </span>
                                        </span>
                                        <ChevronRight size={18} className="sa-mgo" aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}
