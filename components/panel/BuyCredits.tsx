'use client';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, Check, Clock, FlaskConical, Loader2, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { createCheckoutSession, type PublicPackage } from '@/lib/billing/actions';
import { formatMoney, formatUnitPrice, fmtInt } from './credits/format';
import './credits/credits.css';

type Props = {
    packages: PublicPackage[];
    imageCost: number | null;
    videoCost: number | null;
    stripeEnabled: boolean;
    stripeMode: 'live' | 'test' | null;
    canBuy: boolean;
    impersonating?: boolean;
    hasClinic: boolean;
};

const STRIPE_CHECKOUT = 'https://checkout.stripe.com/';

/** Ahorro (%) de cada paquete frente al precio por crédito más caro de su misma moneda. */
function savingsById(packages: PublicPackage[]): Record<string, number> {
    const worst: Record<string, number> = {};
    for (const p of packages) {
        const unit = p.priceCents / p.credits;
        worst[p.currency] = Math.max(worst[p.currency] ?? 0, unit);
    }
    const out: Record<string, number> = {};
    for (const p of packages) {
        const unit = p.priceCents / p.credits;
        const pct = Math.round((1 - unit / worst[p.currency]) * 100);
        if (pct > 0) out[p.id] = pct;
    }
    return out;
}

export function BuyCredits({ packages, imageCost, videoCost, stripeEnabled, stripeMode, canBuy, impersonating, hasClinic }: Props) {
    const defaultId = (packages.find((p) => p.highlight) ?? packages[0])?.id ?? null;
    const [picked, setPicked] = useState<string | null>(null);
    const selectedId = picked && packages.some((p) => p.id === picked) ? picked : defaultId;
    const [redirecting, setRedirecting] = useState<string | null>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const savings = useMemo(() => savingsById(packages), [packages]);
    const selected = packages.find((p) => p.id === selectedId) ?? null;
    const busy = redirecting !== null;

    // Al volver con "atrás" desde Stripe el navegador puede restaurar la página
    // congelada (bfcache) con el botón en "Abriendo…": lo reactivamos.
    useEffect(() => {
        const onShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirecting(null); };
        window.addEventListener('pageshow', onShow);
        return () => window.removeEventListener('pageshow', onShow);
    }, []);

    if (!stripeEnabled) {
        return (
            <div className="cr-soon">
                <span className="cr-soon-ic" aria-hidden><Clock size={22} /></span>
                <strong>Los pagos se activarán pronto</strong>
                <span>Estamos terminando de configurar los pagos con tarjeta. Mientras tanto, tu saldo y tus simulaciones siguen funcionando con normalidad.</span>
            </div>
        );
    }

    if (packages.length === 0) {
        return (
            <div className="cr-soon">
                <span className="cr-soon-ic" aria-hidden><Sparkles size={22} /></span>
                <strong>No hay paquetes disponibles ahora mismo</strong>
                <span>Vuelve a intentarlo en un rato.</span>
            </div>
        );
    }

    function move(from: number, delta: number) {
        if (busy) return;
        const next = (from + delta + packages.length) % packages.length;
        setPicked(packages[next].id);
        optionRefs.current[next]?.focus();
    }

    function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(i, 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(i, -1); }
        else if (e.key === 'Home') { e.preventDefault(); move(0, 0); }
        else if (e.key === 'End') { e.preventDefault(); move(packages.length - 1, 0); }
    }

    async function buy() {
        if (!selected || busy || !canBuy) return;
        setRedirecting(selected.id);
        let res: { url?: string; error?: string };
        try {
            res = await createCheckoutSession(selected.id);
        } catch {
            res = { error: 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.' };
        }
        if (res.url && res.url.startsWith(STRIPE_CHECKOUT)) {
            // Mantiene todo deshabilitado mientras el navegador sale hacia Stripe.
            window.location.assign(res.url);
            return;
        }
        setRedirecting(null);
        toast.error(res.error || 'No se pudo abrir el pago. Inténtalo de nuevo.');
    }

    const blockedNote = !hasClinic
        ? 'Selecciona una clínica para poder recargar.'
        : impersonating
            ? 'Estás viendo esta clínica como operador (solo lectura): la compra está desactivada.'
            : 'Solo los administradores de la clínica pueden comprar créditos.';

    return (
        <MotionConfig reducedMotion="user">
            {stripeMode === 'test' && (
                <div className="cr-testmode" role="note">
                    <FlaskConical size={14} aria-hidden />
                    <span><strong>Modo de prueba</strong> · no se realizan cobros reales. Tarjeta de prueba: 4242 4242 4242 4242.</span>
                </div>
            )}

            <div
                className={`cr-pkg-grid${busy ? ' cr-pkg-grid-busy' : ''}`}
                role="radiogroup"
                aria-label="Paquetes de créditos"
                aria-disabled={busy || undefined}
                style={{ ['--cr-cols' as string]: Math.min(packages.length, 3) }}
            >
                {packages.map((p, i) => {
                    const on = p.id === selectedId;
                    const save = savings[p.id];
                    const sims = imageCost ? Math.floor(p.credits / imageCost) : null;
                    const vids = videoCost ? Math.floor(p.credits / videoCost) : null;
                    return (
                        <motion.button
                            key={p.id}
                            ref={(el) => { optionRefs.current[i] = el; }}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            tabIndex={on ? 0 : -1}
                            disabled={busy}
                            onClick={() => setPicked(p.id)}
                            onKeyDown={(e) => onKey(e, i)}
                            className={`cr-pkg${p.highlight ? ' cr-pkg-featured' : ''}${on ? ' cr-pkg-on' : ''}`}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={busy ? undefined : { y: -5 }}
                            whileTap={busy ? undefined : { scale: 0.985 }}
                        >
                            {on && (
                                <motion.span
                                    layoutId="cr-pkg-ring"
                                    className="cr-pkg-ring"
                                    aria-hidden
                                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                />
                            )}
                            <span className="cr-pkg-head">
                                <span className="cr-pkg-name">{p.name}</span>
                                {p.badge && <span className="cr-pkg-badge">{p.badge}</span>}
                            </span>

                            <span className="cr-pkg-credits">
                                <span className="cr-pkg-num">{fmtInt(p.credits)}</span>
                                <span className="cr-pkg-unit">créditos</span>
                            </span>

                            <span className="cr-pkg-price">{formatMoney(p.priceCents, p.currency)}</span>
                            <span className="cr-pkg-per">{formatUnitPrice(p.priceCents, p.credits, p.currency)} por crédito</span>

                            <span className="cr-pkg-feats">
                                {sims != null && <span><Check size={13} aria-hidden /> ≈ {fmtInt(sims)} simulaciones</span>}
                                {vids != null && <span><Check size={13} aria-hidden /> o ≈ {fmtInt(vids)} vídeos</span>}
                            </span>

                            <span className="cr-pkg-foot">
                                {save ? <span className="cr-pkg-save">Ahorras {save} %</span> : <span className="cr-pkg-save cr-pkg-save-none">Precio base</span>}
                                <span className={`cr-pkg-check${on ? ' cr-pkg-check-on' : ''}`} aria-hidden>
                                    <AnimatePresence initial={false}>
                                        {on && (
                                            <motion.span
                                                key="c"
                                                initial={{ scale: 0, rotate: -40 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                                                style={{ display: 'grid' }}
                                            >
                                                <Check size={14} strokeWidth={3} />
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </span>
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            <div className="cr-checkout">
                <div className="cr-checkout-summary" aria-live="polite">
                    {selected && (
                        <>
                            <span className="mono">TU ELECCIÓN</span>
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.strong
                                    key={selected.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18 }}
                                >
                                    {selected.name} · {fmtInt(selected.credits)} créditos por {formatMoney(selected.priceCents, selected.currency)}
                                </motion.strong>
                            </AnimatePresence>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    className="btn btn-primary cr-buy"
                    onClick={buy}
                    disabled={!canBuy || busy || !selected}
                    aria-describedby={!canBuy ? 'cr-blocked' : undefined}
                >
                    {busy ? (
                        <><Loader2 size={17} className="animate-spin" aria-hidden /> Abriendo pago seguro…</>
                    ) : (
                        <><Lock size={15} aria-hidden /> Comprar <ArrowRight size={16} aria-hidden className="cr-buy-arrow" /></>
                    )}
                </button>
            </div>

            {!canBuy && (
                <p id="cr-blocked" className="cr-blocked">{blockedNote}</p>
            )}

            <ul className="cr-trust" aria-label="Seguridad del pago">
                <li><ShieldCheck size={15} aria-hidden /> Pago seguro con Stripe</li>
                <li><Lock size={14} aria-hidden /> Tus datos de tarjeta nunca pasan por nuestros servidores</li>
                <li><Mail size={14} aria-hidden /> Recibo por email</li>
            </ul>
        </MotionConfig>
    );
}
