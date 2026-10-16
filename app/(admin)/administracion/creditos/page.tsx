import { ArrowDownRight, ArrowUpRight, Coins, Image as ImageIcon, Receipt, Video } from 'lucide-react';
import { getBillingOverview } from '@/lib/billing/actions';
import { isImpersonating } from '@/lib/auth/context';
import { BuyCredits } from '@/components/panel/BuyCredits';
import { PageHead } from '@/components/admin/qoves/PageHead';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
    reserve: 'Consumo',
    refund: 'Devolución',
    topup: 'Recarga',
    adjust: 'Ajuste',
};
const ACTION_LABEL: Record<string, string> = { image: 'Simulación de imagen', video: 'Video', topup: 'Recarga de saldo' };

const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function CreditosPage() {
    const data = await getBillingOverview();
    const impersonating = await isImpersonating();
    const balance = data.clinic?.credit_balance ?? 0;
    const cost = (a: string) => data.costs.find((c) => c.action === a)?.credits;

    return (
        <div className="admin-page">
            <PageHead eyebrow="FACTURACIÓN" title="Créditos" accent="de tu clínica" subtitle="Cada simulación consume créditos de tu saldo. Recarga cuando lo necesites." />

            <div className="dash-split">
                <div className="card card-navy" style={{ padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <span className="mono" style={{ fontSize: 9.5 }}>SALDO DISPONIBLE</span>
                        <span style={{ width: 40, height: 40, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)', color: 'var(--blue-light)' }}>
                            <Coins size={19} />
                        </span>
                    </div>
                    <div>
                        <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.045em', lineHeight: 1 }}>
                            {balance.toLocaleString('es')}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 14.5, marginTop: 8 }}>créditos</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {cost('image') != null && (
                            <span className="sf-cost-chip"><ImageIcon size={14} /> Imagen · {cost('image')} cr.</span>
                        )}
                        {cost('video') != null && (
                            <span className="sf-cost-chip"><Video size={14} /> Video · {cost('video')} cr.</span>
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: 24 }}>
                    <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>RECARGAR</span>
                    <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: '6px 0 18px' }}>
                        Paquetes <span style={{ color: 'var(--ink-3)' }}>de créditos</span>
                    </h3>
                    <BuyCredits packages={data.packages} stripeEnabled={data.stripeEnabled} impersonating={impersonating} />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '22px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>HISTORIAL</span>
                        <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', margin: '6px 0 0' }}>
                            Últimos <span style={{ color: 'var(--ink-3)' }}>movimientos</span>
                        </h3>
                    </div>
                </div>
                {data.recentLedger.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-ic"><Receipt size={22} /></span>
                        <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Sin movimientos todavía</strong>
                        <span style={{ fontSize: 14 }}>Aquí verás recargas y consumos de créditos.</span>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="lead-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Movimiento</th>
                                    <th>Concepto</th>
                                    <th style={{ textAlign: 'right' }}>Δ</th>
                                    <th style={{ textAlign: 'right' }}>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentLedger.map((l, i) => {
                                    const neg = l.credits_delta < 0;
                                    return (
                                        <tr key={i} style={{ cursor: 'default', animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                                            <td style={{ color: 'var(--ink-2)', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                                                    <span style={{ width: 26, height: 26, borderRadius: 9, display: 'grid', placeItems: 'center', background: neg ? 'var(--bg-soft)' : 'var(--blue-soft)', color: neg ? 'var(--ink-2)' : 'var(--blue-deep)' }}>
                                                        {neg ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                                    </span>
                                                    {KIND_LABEL[l.kind] ?? l.kind}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--ink-2)' }}>{l.action ? ACTION_LABEL[l.action] ?? l.action : '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: neg ? 'var(--ink-2)' : 'var(--blue-deep)' }}>
                                                {l.credits_delta > 0 ? '+' : ''}{l.credits_delta}
                                            </td>
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
