'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { toast } from 'sonner';
import { Clock, Lock, X, XCircle } from 'lucide-react';
import { getPurchaseStatus } from '@/lib/billing/actions';
import { fmtInt } from './format';
import './credits.css';

type Phase =
    | { kind: 'checking' }
    | { kind: 'success'; credits: number; balance: number }
    | { kind: 'timeout' }
    | { kind: 'error'; title: string; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_WAIT_MS = 90_000;
/** 2 s durante los primeros 20 s, luego 3 s hasta el minuto y después 5 s. */
const nextDelay = (elapsed: number) => (elapsed < 20_000 ? 2000 : elapsed < 60_000 ? 3000 : 5000);
/** Errores del servidor que no son definitivos: se reintenta. */
const TRANSIENT = new Set(['Demasiadas consultas.']);

type Props = { compra?: string; sessionId?: string; estado?: string };

export function CheckoutReturn({ compra, sessionId, estado }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const [phase, setPhase] = useState<Phase | null>(null);
    const [open, setOpen] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cleanUrl = useCallback(() => {
        router.replace(pathname || '/administracion/creditos', { scroll: false });
        router.refresh();
    }, [router, pathname]);

    const stop = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    }, []);

    useEffect(() => {
        if (!compra) return;
        let cancelled = false;

        if (estado === 'cancelada') {
            // Diferido: en la carga inicial el <Toaster> del layout se suscribe
            // después de este efecto y el aviso se perdería. id fijo = sin duplicados.
            const t = setTimeout(() => {
                toast('Pago cancelado, no se te cobró nada', {
                    id: `cr-cancel-${compra}`,
                    description: 'Puedes elegir otro paquete cuando quieras.',
                });
                cleanUrl();
            }, 120);
            return () => clearTimeout(t);
        }
        if (!sessionId) return;

        const finish = (p: Phase) => {
            if (cancelled) return;
            stop();
            setPhase(p);
            cleanUrl();
        };

        const start = Date.now();
        const poll = async () => {
            if (cancelled) return;
            if (Date.now() - start > MAX_WAIT_MS) return finish({ kind: 'timeout' });
            try {
                const r = await getPurchaseStatus(compra);
                if (cancelled) return;
                if (r.ok) {
                    if (r.status === 'paid') return finish({ kind: 'success', credits: r.credits, balance: r.balance });
                    if (r.status === 'failed') return finish({ kind: 'error', title: 'El pago no se completó', message: 'Tu banco rechazó el cobro o hubo un problema con la tarjeta. No se acreditaron créditos; puedes intentarlo de nuevo.' });
                    if (r.status === 'expired') return finish({ kind: 'error', title: 'La sesión de pago caducó', message: 'El pago no llegó a completarse a tiempo y no se te cobró nada. Puedes iniciar una nueva compra.' });
                    if (r.status === 'refunded') return finish({ kind: 'error', title: 'Esta compra fue reembolsada', message: 'El importe se devolvió a tu tarjeta y los créditos asociados se descontaron.' });
                    // pending → seguir esperando
                } else if (!TRANSIENT.has(r.error)) {
                    return finish({
                        kind: 'error',
                        title: 'No pudimos confirmar el pago',
                        message: r.error === 'Compra no encontrada.'
                            ? 'No encontramos esta compra en tu clínica. Si se te cobró, el saldo se actualizará solo en unos minutos.'
                            : r.error,
                    });
                }
            } catch {
                // Red caída: reintentar en el siguiente ciclo.
            }
            if (cancelled) return;
            const elapsed = Date.now() - start;
            const wait = nextDelay(elapsed);
            timer.current = elapsed + wait > MAX_WAIT_MS
                ? setTimeout(() => finish({ kind: 'timeout' }), Math.max(0, MAX_WAIT_MS - elapsed))
                : setTimeout(poll, wait);
        };

        // Arranque diferido: evita setState síncrono dentro del efecto.
        timer.current = setTimeout(() => {
            setPhase({ kind: 'checking' });
            setOpen(true);
            if (!UUID.test(compra)) {
                finish({ kind: 'error', title: 'No pudimos confirmar el pago', message: 'El enlace de vuelta no es válido. Si se te cobró, el saldo se actualizará solo en unos minutos.' });
                return;
            }
            void poll();
        }, 0);

        return () => { cancelled = true; stop(); };
    }, [compra, sessionId, estado, cleanUrl, stop]);

    function close() {
        if (phase?.kind === 'checking') {
            stop();
            cleanUrl();
            toast('Seguimos procesando tu pago', { description: 'El saldo se actualizará solo en unos minutos.' });
        }
        setOpen(false);
    }

    return (
        <MotionConfig reducedMotion="user">
            <Dialog.Root open={open} onOpenChange={(o) => { if (!o) close(); }}>
                <AnimatePresence>
                    {open && phase && (
                        <Dialog.Portal forceMount>
                            <div className="qoves-admin">
                                <Dialog.Overlay asChild forceMount>
                                    <motion.div
                                        className="cr-ov"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                    />
                                </Dialog.Overlay>
                                <Dialog.Content
                                    asChild
                                    forceMount
                                    onPointerDownOutside={(e) => { if (phase.kind === 'checking') e.preventDefault(); }}
                                    aria-describedby="cr-ov-desc"
                                >
                                    <motion.div
                                        className="cr-ov-card"
                                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                                        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                                    >
                                        <Dialog.Close className="cr-ov-x" aria-label={phase.kind === 'checking' ? 'Cerrar y seguir en segundo plano' : 'Cerrar'}>
                                            <X size={16} />
                                        </Dialog.Close>
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.div
                                                key={phase.kind}
                                                className="cr-ov-body"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.25 }}
                                            >
                                                <PhaseView phase={phase} onDone={() => setOpen(false)} />
                                            </motion.div>
                                        </AnimatePresence>
                                    </motion.div>
                                </Dialog.Content>
                            </div>
                        </Dialog.Portal>
                    )}
                </AnimatePresence>
            </Dialog.Root>
        </MotionConfig>
    );
}

function PhaseView({ phase, onDone }: { phase: Phase; onDone: () => void }) {
    if (phase.kind === 'checking') {
        return (
            <>
                <div className="cr-ov-spin" aria-hidden>
                    <span className="cr-ov-spin-ring" />
                    <Lock size={22} />
                </div>
                <Dialog.Title className="cr-ov-title">Confirmando tu pago…</Dialog.Title>
                <Dialog.Description id="cr-ov-desc" className="cr-ov-text">
                    Stripe nos está confirmando la operación. Suele tardar unos segundos; no cierres esta pestaña.
                </Dialog.Description>
                <div className="cr-ov-progress" aria-hidden><span /></div>
            </>
        );
    }
    if (phase.kind === 'success') {
        return <SuccessView credits={phase.credits} balance={phase.balance} onDone={onDone} />;
    }
    if (phase.kind === 'timeout') {
        return (
            <>
                <div className="cr-ov-icon cr-ov-icon-wait" aria-hidden><Clock size={26} /></div>
                <Dialog.Title className="cr-ov-title">Tu pago se está procesando</Dialog.Title>
                <Dialog.Description id="cr-ov-desc" className="cr-ov-text">
                    Lo verás reflejado en tu saldo en unos minutos. No hace falta que vuelvas a pagar; te llegará el recibo por email.
                </Dialog.Description>
                <button type="button" className="btn btn-primary btn-sm cr-ov-cta" onClick={onDone}>Entendido</button>
            </>
        );
    }
    return (
        <>
            <div className="cr-ov-icon cr-ov-icon-err" aria-hidden><XCircle size={26} /></div>
            <Dialog.Title className="cr-ov-title">{phase.title}</Dialog.Title>
            <Dialog.Description id="cr-ov-desc" className="cr-ov-text">{phase.message}</Dialog.Description>
            <button type="button" className="btn btn-primary btn-sm cr-ov-cta" onClick={onDone}>Volver a créditos</button>
        </>
    );
}

function SuccessView({ credits, balance, onDone }: { credits: number; balance: number; onDone: () => void }) {
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const t = setTimeout(() => setShown(credits), 350);
        return () => clearTimeout(t);
    }, [credits]);
    return (
        <>
            <div className="cr-ov-ok" aria-hidden>
                <motion.span
                    className="cr-ov-ok-burst"
                    initial={{ scale: 0.6, opacity: 0.7 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
                />
                <motion.svg viewBox="0 0 52 52" width="64" height="64">
                    <motion.circle
                        cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.path
                        d="M15 27 l7 7 l15 -16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, delay: 0.45, ease: 'easeOut' }}
                    />
                </motion.svg>
            </div>
            <Dialog.Title className="cr-ov-title">¡Pago confirmado!</Dialog.Title>
            <div className="cr-ov-plus" aria-hidden>
                +<NumberFlow value={shown} locales="es" /> <span>créditos</span>
            </div>
            <Dialog.Description id="cr-ov-desc" className="cr-ov-text">
                <span className="sr-only">Se añadieron {fmtInt(credits)} créditos. </span>
                Tu nuevo saldo es de <strong>{fmtInt(balance)} créditos</strong>. Te enviamos el recibo por email.
            </Dialog.Description>
            <button type="button" className="btn btn-primary btn-sm cr-ov-cta" onClick={onDone}>Empezar a usarlos</button>
        </>
    );
}
