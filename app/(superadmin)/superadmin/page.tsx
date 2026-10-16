import Link from 'next/link';
import { getPlatformOverview, getClinicsList, getUsageSeries } from '@/lib/platform/queries';
import { UsageChart } from '@/components/platform/UsageChart';
import { PageHead } from '@/components/admin/qoves/PageHead';
import { StatCard } from '@/components/admin/qoves/StatCard';
import { C, CLINIC_STATUS, SERIES } from '@/lib/brand';

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
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
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
                action={<Link href="/superadmin/export" className="btn btn-white btn-sm">Exportar CSV</Link>}
            />

            <div className="kpi-grid">
                <StatCard label="INGRESOS (STRIPE)" value={ov.revenueCents / 100} format={{ style: 'currency', currency: 'USD' }} locales="en-US" index={0} />
                <StatCard label="CLÍNICAS" value={ov.clinics} index={1} />
                <StatCard label="USUARIOS" value={ov.users} index={2} />
                <StatCard label="LEADS" value={ov.leads} index={3} />
                <StatCard label="SIMULACIONES" value={ov.images} index={4} />
                <StatCard label="VÍDEOS" value={ov.videos} index={5} />
                <StatCard label="CRÉDITOS EN CIRCULACIÓN" value={ov.creditsInCirculation} index={6} />
                <StatCard label="CRÉDITOS VENDIDOS" value={ov.creditsSold} index={7} />
            </div>

            <div className="dash-split">
                {/* Usage chart */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 12 }}>
                        <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>GENERACIONES · 30 DÍAS</span>
                        <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Uso <span style={{ color: 'var(--ink-3)' }}>de la plataforma</span></h3>
                    </div>
                    <UsageChart data={usage} />
                </div>

                {/* Plans distribution */}
                <div className="card" style={{ padding: 24 }}>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>{ov.clinics} CLÍNICAS</span>
                    <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 0' }}>Distribución <span style={{ color: 'var(--ink-3)' }}>de planes</span></h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
                        {ov.plans.map((p, i) => (
                            <div key={p.plan}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13.5 }}>{p.plan}</span>
                                    <span className="mono" style={{ fontSize: 10 }}>{p.count} · {Math.round((p.count / totalPlans) * 100)}%</span>
                                </div>
                                <div style={{ height: 10, background: 'var(--blue-tint)', border: '1px solid var(--blue-line)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div className="sf-bar" style={{ width: `${(p.count / totalPlans) * 100}%`, height: '100%', background: `linear-gradient(90deg, ${SERIES[i % SERIES.length]}, ${C.blueAccent})`, borderRadius: 99, animationDelay: `${0.2 + i * 0.1}s` }} />
                                </div>
                            </div>
                        ))}
                        {ov.plans.length === 0 && <span className="lead" style={{ fontSize: 13 }}>Sin datos de planes.</span>}
                    </div>
                </div>
            </div>

            {/* Clinics table */}
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Clínicas <span style={{ color: 'var(--ink-3)' }}>de la plataforma</span></h3>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>{clinics.length} EN TOTAL</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="lead-table" style={{ minWidth: 760 }}>
                        <thead>
                            <tr><th>Clínica</th><th>Plan</th><th>Saldo</th><th>Miembros</th><th>Leads</th><th>Estado</th><th></th></tr>
                        </thead>
                        <tbody>
                            {clinics.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                            <span className="avatar" style={{ borderRadius: 9 }}>{initials(c.name)}</span>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em' }}>{c.name}</div>
                                                <div className="mono" style={{ fontSize: 9 }}>{c.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="mono" style={{ fontSize: 10 }}>{c.plan?.toUpperCase()}</span></td>
                                    <td style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>{c.credit_balance}</td>
                                    <td style={{ fontSize: 13.5 }}>{c.members}</td>
                                    <td style={{ fontSize: 13.5 }}>{c.leads}</td>
                                    <td><ClinicPill status={c.status} /></td>
                                    <td><Link href={`/superadmin/clinicas/${c.id}`} className="row-go">Ver →</Link></td>
                                </tr>
                            ))}
                            {clinics.length === 0 && (
                                <tr><td colSpan={7} style={{ padding: 0 }}><div className="empty-state">Sin clínicas todavía</div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
