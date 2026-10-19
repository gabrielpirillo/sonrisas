'use client';
import { useState, type KeyboardEvent } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Receipt, ShoppingBag } from 'lucide-react';
import type { BillingOverview, PurchaseSummary } from '@/lib/billing/actions';
import { formatMoney, fmtInt } from './format';
import { useMounted } from './useMounted';
import './credits.css';

type Ledger = BillingOverview['recentLedger'];

const KIND_LABEL: Record<string, string> = { reserve: 'Consumo', refund: 'Devolución', topup: 'Recarga', adjust: 'Ajuste' };
const ACTION_LABEL: Record<string, string> = {
    image: 'Simulación de imagen',
    video: 'Vídeo',
    topup: 'Recarga de saldo',
    adjust: 'Ajuste manual',
    refund: 'Reembolso de compra',
};
const STATUS: Record<PurchaseSummary['status'], { label: string; cls: string }> = {
    paid: { label: 'Pagado', cls: 'cr-st-paid' },
    refunded: { label: 'Reembolsado', cls: 'cr-st-refunded' },
    expired: { label: 'Expirado', cls: 'cr-st-muted' },
    failed: { label: 'Fallido', cls: 'cr-st-failed' },
    pending: { label: 'Pendiente', cls: 'cr-st-muted' },
};

/** Fecha en UTC al renderizar en servidor; en la zona del navegador tras hidratar. */
function When({ iso, withTime = true }: { iso: string; withTime?: boolean }) {
    const mounted = useMounted();
    const d = new Date(iso);
    const opts: Intl.DateTimeFormatOptions = withTime
        ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: '2-digit', month: 'short', year: 'numeric' };
    const text = d.toLocaleString('es', mounted ? opts : { ...opts, timeZone: 'UTC' });
    return <time dateTime={iso}>{text}</time>;
}

const safeReceipt = (url: string | null) => (url && /^https:\/\/[^\s]+$/.test(url) ? url : null);

export function CreditsHistory({ purchases, ledger }: { purchases: PurchaseSummary[]; ledger: Ledger }) {
    const [tab, setTab] = useState<'compras' | 'movimientos'>(purchases.length ? 'compras' : 'movimientos');
    const tabs = [
        { id: 'compras' as const, label: 'Compras', count: purchases.length },
        { id: 'movimientos' as const, label: 'Movimientos', count: ledger.length },
    ];

    function onKey(e: KeyboardEvent<HTMLButtonElement>) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const next = tab === 'compras' ? 'movimientos' : 'compras';
        setTab(next);
        document.getElementById(`cr-tab-${next}`)?.focus();
    }

    return (
        <MotionConfig reducedMotion="user">
            <section className="card cr-hist" aria-labelledby="cr-hist-title">
                <div className="cr-hist-head">
                    <div>
                        <span className="mono" style={{ fontSize: 9.5, color: 'var(--blue-deep)' }}>HISTORIAL</span>
                        <h2 id="cr-hist-title" className="cr-h2">Compras <span>y movimientos</span></h2>
                    </div>
                    <div className="seg" role="tablist" aria-label="Historial">
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                id={`cr-tab-${t.id}`}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.id}
                                aria-controls={`cr-panel-${t.id}`}
                                tabIndex={tab === t.id ? 0 : -1}
                                className={`cr-seg-btn${tab === t.id ? ' seg-on' : ''}`}
                                onClick={() => setTab(t.id)}
                                onKeyDown={onKey}
                            >
                                {tab === t.id && (
                                    <motion.span layoutId="cr-seg-pill" className="cr-seg-pill" transition={{ type: 'spring', stiffness: 450, damping: 36 }} aria-hidden />
                                )}
                                <span className="cr-seg-label">{t.label}<span className="seg-count">{t.count}</span></span>
                            </button>
                        ))}
                    </div>
                </div>

                <div id={`cr-panel-${tab}`} role="tabpanel" aria-labelledby={`cr-tab-${tab}`}>
                    {tab === 'compras' ? <Purchases purchases={purchases} /> : <LedgerList ledger={ledger} />}
                </div>
            </section>
        </MotionConfig>
    );
}

function Purchases({ purchases }: { purchases: PurchaseSummary[] }) {
    if (purchases.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-ic"><ShoppingBag size={22} /></span>
                <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Aún no has comprado créditos</strong>
                <span style={{ fontSize: 14 }}>Tus compras y sus recibos aparecerán aquí.</span>
            </div>
        );
    }
    return (
        <div className="cr-rows" role="table" aria-label="Compras">
            <div className="cr-row cr-row-head cr-row-buy" role="row">
                <span role="columnheader">Fecha</span>
                <span role="columnheader">Paquete</span>
                <span role="columnheader" className="cr-num">Créditos</span>
                <span role="columnheader" className="cr-num">Importe</span>
                <span role="columnheader">Estado</span>
                <span role="columnheader" className="cr-num">Recibo</span>
            </div>
            {purchases.map((p, i) => {
                const st = STATUS[p.status] ?? { label: p.status, cls: 'cr-st-muted' };
                const receipt = safeReceipt(p.receiptUrl);
                return (
                    <motion.div
                        key={p.id}
                        role="row"
                        className="cr-row cr-row-buy"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.035 }}
                    >
                        <span role="cell" className="cr-date"><When iso={p.createdAt} /></span>
                        <span role="cell" className="cr-pkgname">{p.packageName}</span>
                        <span role="cell" className={`cr-num ${p.status === 'paid' ? 'cr-strong' : 'cr-dim'}`}>{p.status === 'paid' ? '+' : ''}{fmtInt(p.credits)}<small> cr.</small></span>
                        <span role="cell" className="cr-num">{formatMoney(p.amountCents, p.currency)}</span>
                        <span role="cell"><span className={`cr-st ${st.cls}`}><span className="cr-st-dot" />{st.label}</span></span>
                        <span role="cell" className="cr-num">
                            {receipt ? (
                                <a className="text-link" href={receipt} target="_blank" rel="noopener noreferrer">
                                    Recibo <ExternalLink size={13} aria-hidden /><span className="sr-only"> (se abre en otra pestaña)</span>
                                </a>
                            ) : <span className="cr-dim">—</span>}
                        </span>
                    </motion.div>
                );
            })}
        </div>
    );
}

function LedgerList({ ledger }: { ledger: Ledger }) {
    if (ledger.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-ic"><Receipt size={22} /></span>
                <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Sin movimientos todavía</strong>
                <span style={{ fontSize: 14 }}>Aquí verás recargas y consumos de créditos.</span>
            </div>
        );
    }
    return (
        <div className="cr-rows" role="table" aria-label="Movimientos">
            <div className="cr-row cr-row-head cr-row-led" role="row">
                <span role="columnheader">Fecha</span>
                <span role="columnheader">Movimiento</span>
                <span role="columnheader">Concepto</span>
                <span role="columnheader" className="cr-num">Δ</span>
                <span role="columnheader" className="cr-num">Saldo</span>
            </div>
            {ledger.map((l, i) => {
                const neg = l.credits_delta < 0;
                return (
                    <motion.div
                        key={`${l.created_at}-${i}`}
                        role="row"
                        className="cr-row cr-row-led"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(i, 10) * 0.03 }}
                    >
                        <span role="cell" className="cr-date"><When iso={String(l.created_at)} /></span>
                        <span role="cell" className="cr-kind">
                            <span className={`cr-kind-ic${neg ? '' : ' cr-kind-ic-up'}`} aria-hidden>
                                {neg ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                            </span>
                            {KIND_LABEL[l.kind] ?? l.kind}
                        </span>
                        <span role="cell" className="cr-concept">{l.action ? ACTION_LABEL[l.action] ?? l.action : '—'}</span>
                        <span role="cell" className={`cr-num cr-strong${neg ? ' cr-neg' : ' cr-pos'}`}>
                            {l.credits_delta > 0 ? '+' : ''}{fmtInt(l.credits_delta)}
                        </span>
                        <span role="cell" className="cr-num cr-bal">{fmtInt(l.balance_after)}</span>
                    </motion.div>
                );
            })}
        </div>
    );
}
