import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDownRight, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getClinicDetail } from '@/lib/platform/queries';
import { ClinicActions } from '@/components/platform/ClinicActions';
import { ledgerConcept, ledgerKind, planLabel } from '@/components/platform/labels';
import { StatCard } from '@/components/admin/qoves/StatCard';
import { BreakableEmail } from '@/components/platform/BreakableEmail';
import { CLINIC_STATUS, C } from '@/lib/brand';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };

const when = (d: string) => new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function SectionTitle({ eyebrow, title, accent }: { eyebrow: string; title: string; accent?: string }) {
    return (
        <div className="sa-card-head">
            <div>
                <span className="mono sa-eyebrow">{eyebrow}</span>
                <h3 className="sa-h3">
                    {title} {accent && <span className="dim">{accent}</span>}
                </h3>
            </div>
        </div>
    );
}

export default async function ClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const c = await getClinicDetail(id);
    if (!c) notFound();
    const st = CLINIC_STATUS[c.status] || { label: c.status, dot: C.blue };
    const initials = c.name.split(/\s+/).filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    const data: Array<[string, string, boolean]> = [
        ['SLUG', c.slug, true],
        ['CLAVE DEL WIDGET', c.public_widget_key, true],
        ['LEADS', String(c.leads), false],
        ['STRIPE', c.stripe_customer_id || '—', !!c.stripe_customer_id],
        ['FLEXPRICE', c.flexprice_customer_id || '—', !!c.flexprice_customer_id],
    ];

    return (
        <div className="admin-page">
            <Link href="/superadmin" className="row-go sa-back">
                <ArrowLeft size={15} aria-hidden /> Todas las clínicas
            </Link>

            <div className="card card-navy sa-clinic-hero">
                <span className="sa-clinic-avatar" aria-hidden>{initials}</span>
                <div className="sa-clinic-id">
                    <span className="mono" style={{ fontSize: 9.5 }}>CLÍNICA · {c.slug}</span>
                    <h1 className="sa-clinic-name">{c.name}</h1>
                </div>
                <div className="sa-clinic-chips">
                    <span className="sf-cost-chip" style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em' }}>
                        <span className="sr-only">Plan </span>{planLabel(c.plan)}
                    </span>
                    <span className="sf-cost-chip">
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.status === 'active' ? 'var(--scan)' : st.dot, boxShadow: c.status === 'active' ? '0 0 8px var(--scan)' : 'none' }} />
                        {st.label}
                    </span>
                </div>
            </div>

            <div className="kpi-grid">
                <StatCard label="SALDO" value={c.credit_balance} index={0} />
                <StatCard label="MIEMBROS" value={c.members} index={1} />
                <StatCard label="IMÁGENES" value={c.images} index={2} />
                <StatCard label="VÍDEOS" value={c.videos} index={3} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <SectionTitle eyebrow="OPERACIÓN" title="Acciones" accent="de plataforma" />
                <ClinicActions clinicId={c.id} currentPlan={c.plan} status={c.status} />
            </div>

            <div className="config-grid">
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionTitle eyebrow="FICHA" title="Datos" accent="técnicos" />
                    <dl className="sa-facts">
                        {data.map(([k, v, code]) => (
                            <div key={k} className="sa-fact">
                                <dt className="mono">{k}</dt>
                                <dd className={code ? 'sa-code' : undefined}>{v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionTitle eyebrow={`EQUIPO · ${c.membersList.length}`} title="Miembros" />
                    <div style={{ padding: 16 }}>
                        {c.membersList.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}>Sin miembros</div>
                        ) : (
                            <div className="sf-list">
                                {c.membersList.map((m, i) => (
                                    <div key={i} className="sf-row sa-member" style={{ animationDelay: `${i * 40}ms` }}>
                                        <span className="sa-member-id">
                                            <span className="avatar" style={{ width: 32, height: 32, fontSize: 11.5 }}>{(m.email || '?').slice(0, 2).toUpperCase()}</span>
                                            <span className="sa-member-email" title={m.email}><BreakableEmail email={m.email} /></span>
                                        </span>
                                        <span className="sf-badge" style={{ flexShrink: 0 }}>{ROLE_LABEL[m.role] ?? m.role}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card sa-cq" style={{ padding: 0, overflow: 'hidden' }}>
                <SectionTitle eyebrow="CRÉDITOS" title="Movimientos" accent="recientes" />
                {c.ledger.length === 0 ? (
                    <div className="empty-state">Sin movimientos</div>
                ) : (
                    <>
                        <div className="sa-table-scroll sa-desktop-only">
                            <table className="lead-table" style={{ minWidth: 600 }}>
                                <thead>
                                    <tr><th>Fecha</th><th>Movimiento</th><th>Concepto</th><th style={{ textAlign: 'right' }}>Créditos</th><th style={{ textAlign: 'right' }}>Saldo</th></tr>
                                </thead>
                                <tbody>
                                    {c.ledger.map((l, i) => {
                                        const neg = l.credits_delta < 0;
                                        return (
                                            <tr key={i} style={{ cursor: 'default' }}>
                                                <td style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{when(l.created_at)}</td>
                                                <td>
                                                    <span className="sa-led-kind">
                                                        <span className={`sa-led-ic${neg ? ' sa-led-ic-neg' : ''}`}>
                                                            {neg ? <ArrowDownRight size={14} aria-hidden /> : <ArrowUpRight size={14} aria-hidden />}
                                                        </span>
                                                        {ledgerKind(l.kind)}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--ink-2)', overflowWrap: 'anywhere' }}>{ledgerConcept(l.action) ?? '—'}</td>
                                                <td style={{ textAlign: 'right' }}><span className={`sa-led-delta${neg ? ' sa-led-delta-neg' : ''}`}>{l.credits_delta > 0 ? '+' : ''}{l.credits_delta}</span></td>
                                                <td className="sa-num" style={{ textAlign: 'right' }}>{l.balance_after}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <ul className="sa-mlist sa-mobile-only">
                            {c.ledger.map((l, i) => {
                                const neg = l.credits_delta < 0;
                                return (
                                    <li key={i} className="sa-mitem sa-led" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                                        <span className="sa-led-kind">
                                            <span className={`sa-led-ic${neg ? ' sa-led-ic-neg' : ''}`}>
                                                {neg ? <ArrowDownRight size={14} aria-hidden /> : <ArrowUpRight size={14} aria-hidden />}
                                            </span>
                                            {ledgerKind(l.kind)}
                                        </span>
                                        <span className={`sa-led-delta${neg ? ' sa-led-delta-neg' : ''}`}>{l.credits_delta > 0 ? '+' : ''}{l.credits_delta}</span>
                                        <span className="sa-led-date">{when(l.created_at)}</span>
                                        <span className="sa-led-bal">Saldo {l.balance_after}</span>
                                        {l.action && <span className="sa-led-concept">{ledgerConcept(l.action)}</span>}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}
