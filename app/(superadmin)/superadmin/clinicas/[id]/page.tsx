import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDownRight, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getClinicDetail } from '@/lib/platform/queries';
import { ClinicActions } from '@/components/platform/ClinicActions';
import { StatCard } from '@/components/admin/qoves/StatCard';
import { CLINIC_STATUS, C } from '@/lib/brand';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = { reserve: 'Consumo', refund: 'Devolución', topup: 'Recarga', adjust: 'Ajuste' };
const ROLE_LABEL: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', member: 'Miembro' };

function SectionTitle({ eyebrow, title, accent }: { eyebrow: string; title: string; accent?: string }) {
    return (
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--line)' }}>
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>{eyebrow}</span>
            <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: '4px 0 0' }}>
                {title} {accent && <span style={{ color: 'var(--ink-3)' }}>{accent}</span>}
            </h3>
        </div>
    );
}

export default async function ClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const c = await getClinicDetail(id);
    if (!c) notFound();
    const st = CLINIC_STATUS[c.status] || { label: c.status, dot: C.blue };
    const initials = c.name.split(/\s+/).filter(Boolean).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

    const data: Array<[string, string]> = [
        ['SLUG', c.slug],
        ['CLAVE DEL WIDGET', c.public_widget_key],
        ['LEADS', String(c.leads)],
        ['STRIPE', c.stripe_customer_id || '—'],
        ['FLEXPRICE', c.flexprice_customer_id || '—'],
    ];

    return (
        <div className="admin-page">
            <Link href="/superadmin" className="row-go" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', alignSelf: 'flex-start' }}>
                <ArrowLeft size={15} /> Todas las clínicas
            </Link>

            <div className="card card-navy" style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <span style={{ width: 60, height: 60, borderRadius: 18, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 600, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'var(--blue-light)', flexShrink: 0 }}>
                    {initials}
                </span>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <span className="mono" style={{ fontSize: 9.5 }}>CLÍNICA · {c.slug}</span>
                    <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '6px 0 0' }}>{c.name}</h1>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className="sf-cost-chip" style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em' }}>{c.plan}</span>
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
                <StatCard label="VIDEOS" value={c.videos} index={3} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <SectionTitle eyebrow="OPERACIÓN" title="Acciones" accent="de plataforma" />
                <div style={{ padding: 18 }}>
                    <ClinicActions clinicId={c.id} currentPlan={c.plan} status={c.status} />
                </div>
            </div>

            <div className="config-grid">
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionTitle eyebrow="FICHA" title="Datos" accent="técnicos" />
                    <div style={{ padding: '8px 22px 18px' }}>
                        {data.map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--line)', alignItems: 'baseline' }}>
                                <span className="mono" style={{ fontSize: 9, flexShrink: 0 }}>{k}</span>
                                <span style={{ fontSize: 13.5, fontFamily: k === 'CLAVE DEL WIDGET' ? 'var(--font-mono)' : undefined, wordBreak: 'break-all', textAlign: 'right' }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <SectionTitle eyebrow={`EQUIPO · ${c.membersList.length}`} title="Miembros" />
                    <div style={{ padding: 16 }}>
                        {c.membersList.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}>Sin miembros</div>
                        ) : (
                            <div className="sf-list">
                                {c.membersList.map((m, i) => (
                                    <div key={i} className="sf-row" style={{ padding: '10px 12px', animationDelay: `${i * 40}ms` }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                            <span className="avatar" style={{ width: 32, height: 32, fontSize: 11.5, flexShrink: 0 }}>{(m.email || '?').slice(0, 2).toUpperCase()}</span>
                                            <span style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
                                        </span>
                                        <span className="sf-badge">{ROLE_LABEL[m.role] ?? m.role}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <SectionTitle eyebrow="CRÉDITOS" title="Movimientos" accent="recientes" />
                {c.ledger.length === 0 ? (
                    <div className="empty-state">Sin movimientos</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="lead-table" style={{ minWidth: 620 }}>
                            <thead>
                                <tr><th>Fecha</th><th>Movimiento</th><th>Concepto</th><th style={{ textAlign: 'right' }}>Δ</th><th style={{ textAlign: 'right' }}>Saldo</th></tr>
                            </thead>
                            <tbody>
                                {c.ledger.map((l, i) => {
                                    const neg = l.credits_delta < 0;
                                    return (
                                        <tr key={i} style={{ cursor: 'default' }}>
                                            <td style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                                                    <span style={{ width: 26, height: 26, borderRadius: 9, display: 'grid', placeItems: 'center', background: neg ? 'var(--bg-soft)' : 'var(--blue-soft)', color: neg ? 'var(--ink-2)' : 'var(--blue-deep)' }}>
                                                        {neg ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                                    </span>
                                                    {KIND_LABEL[l.kind] ?? l.kind}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--ink-2)' }}>{l.action ?? '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: neg ? 'var(--ink-2)' : 'var(--blue-deep)' }}>{l.credits_delta > 0 ? '+' : ''}{l.credits_delta}</td>
                                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{l.balance_after}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
