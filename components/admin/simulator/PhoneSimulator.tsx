"use client";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Coins, Info, RotateCw, ScanFace, Smile, X } from "lucide-react";
import { LogoMark } from "@/components/admin/qoves/LogoMark";
import { useMounted } from "@/components/panel/credits/useMounted";
import { EASE, RESIZE_TYPE, STEPS, TIPS, creditInfo, widgetSrc } from "./shared";
import "./simulator-phone.css";

/* ================================================================== */
/* Portada en teléfonos: cabecera compacta + CTA + pasos + consejos     */
/* ================================================================== */
type HomeProps = {
    balance: number;
    imageCost: number | null;
    canRecharge: boolean;
    impersonating: boolean;
    onStart: () => void;
};

export const PhoneHome = forwardRef<HTMLButtonElement, HomeProps>(function PhoneHome(
    { balance, imageCost, canRecharge, impersonating, onStart },
    ctaRef,
) {
    const mounted = useMounted();
    const { sims, empty, low } = creditInfo(balance, imageCost);
    const value = sims ?? balance;
    const unit = sims === null
        ? (balance === 1 ? "crédito" : "créditos")
        : (sims === 1 ? "simulación" : "simulaciones");

    return (
        <div className="sim-m">
            <section className={"sim-m-hero" + (low ? " is-low" : "")} aria-labelledby="sim-m-title">
                <span className="sim-m-orb" aria-hidden />
                <span className="sim-m-grid" aria-hidden />

                <div className="sim-m-top">
                    <span className="sim-m-chip" role="status" aria-label={`Te quedan ${sims === null ? "" : "unas "}${value} ${unit}`}>
                        <Coins size={14} aria-hidden />
                        <span aria-hidden>
                            {sims !== null && "≈ "}
                            <NumberFlow value={mounted ? value : 0} locales="es" />
                            {" "}{unit}
                        </span>
                    </span>
                </div>

                <h1 id="sim-m-title" className="sim-m-title">
                    Enséñale su nueva sonrisa <span className="sim-shine">antes de empezar</span>
                </h1>
                <p className="sim-m-lead">El simulador real de tu web, a pantalla completa. Tres pasos y menos de un minuto.</p>

                {low && (
                    <div className="sim-m-low" role="status">
                        <span className="sim-m-low-dot" aria-hidden />
                        <span className="sim-m-low-text">
                            {empty ? "Sin saldo: no se podrán generar resultados." : "Saldo bajo para una demo larga."}
                        </span>
                        {canRecharge && (
                            <Link href="/administracion/creditos" className="sim-m-low-link">
                                Recargar <ArrowRight size={14} aria-hidden />
                            </Link>
                        )}
                    </div>
                )}

                <button ref={ctaRef} type="button" className="sim-m-cta" onClick={onStart} aria-haspopup="dialog">
                    <span className="sim-m-cta-ic" aria-hidden><ScanFace size={20} /></span>
                    <span className="sim-m-cta-label">Iniciar simulación</span>
                    <ArrowRight size={18} aria-hidden className="sim-m-cta-arrow" />
                </button>

                <p className="sim-m-cost">
                    {imageCost ? `${imageCost} ${imageCost === 1 ? "crédito" : "créditos"} por simulación` : "Consume créditos de tu saldo"}
                    {" · "}los datos se guardan como lead
                </p>
            </section>

            {impersonating && (
                <p className="sim-imp-note" role="note">
                    <Info size={14} aria-hidden />
                    Estás impersonando: lo que hagas aquí consume créditos reales de esta clínica.
                </p>
            )}

            <section className="sim-m-steps" aria-labelledby="sim-m-steps-title">
                <div className="sim-m-head">
                    <span className="mono">CÓMO FUNCIONA</span>
                    <h2 id="sim-m-steps-title">Tres pasos, <span>un minuto</span></h2>
                </div>
                <ol className="sim-m-steps-list">
                    {STEPS.map((s, i) => (
                        <li key={s.title} className="sim-m-step">
                            <span className="sim-m-step-ic" aria-hidden>{s.icon}</span>
                            <div className="sim-m-step-body">
                                <span className="mono">PASO {i + 1}</span>
                                <strong>{s.title}</strong>
                                <p>{s.text}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <PhoneTips />
        </div>
    );
});

function PhoneTips() {
    const listRef = useRef<HTMLUListElement>(null);
    const [active, setActive] = useState(0);

    const onScroll = useCallback(() => {
        const el = listRef.current;
        const first = el?.firstElementChild as HTMLElement | null;
        if (!el || !first) return;
        const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0");
        const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
        setActive(atEnd ? TIPS.length - 1 : Math.max(0, Math.min(TIPS.length - 1, Math.round(el.scrollLeft / step))));
    }, []);

    return (
        <section className="sim-m-tips" aria-labelledby="sim-m-tips-title">
            <div className="sim-m-head">
                <span className="mono">CONSEJOS PARA LA FOTO</span>
                <h2 id="sim-m-tips-title">Una buena foto, <span>un gran resultado</span></h2>
            </div>
            <ul
                ref={listRef}
                className="sim-m-tips-list"
                onScroll={onScroll}
                tabIndex={0}
                aria-label="Consejos, desliza para ver más"
            >
                {TIPS.map((t, i) => (
                    <li key={t.title} className="sim-m-tip">
                        <div className="sim-m-tip-top">
                            <span className="sim-m-tip-ic" aria-hidden>{t.icon}</span>
                            <span className="sim-m-tip-num mono" aria-hidden>0{i + 1}/0{TIPS.length}</span>
                        </div>
                        <strong>{t.title}</strong>
                        <p>{t.text}</p>
                    </li>
                ))}
            </ul>
            <div className="sim-m-dots" aria-hidden>
                {TIPS.map((t, i) => <i key={t.title} className={i === active ? "is-on" : ""} />)}
            </div>
        </section>
    );
}

/* ================================================================== */
/* Hoja a pantalla completa con el widget (sin Fullscreen API: iPhone)  */
/* ================================================================== */
type SheetProps = {
    open: boolean;
    widgetKey: string;
    clinicName: string;
    onClose: () => void;
};

/** Bloquea el scroll de la página (técnica body fijo: también en iOS Safari). */
function useScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return;
        const y = window.scrollY;
        const html = document.documentElement.style;
        const body = document.body.style;
        const prev = {
            htmlOverflow: html.overflow, overflow: body.overflow, position: body.position,
            top: body.top, left: body.left, right: body.right, width: body.width,
        };
        html.overflow = "hidden";
        body.overflow = "hidden";
        body.position = "fixed";
        body.top = `-${y}px`;
        body.left = "0";
        body.right = "0";
        body.width = "100%";
        return () => {
            html.overflow = prev.htmlOverflow;
            body.overflow = prev.overflow;
            body.position = prev.position;
            body.top = prev.top;
            body.left = prev.left;
            body.right = prev.right;
            body.width = prev.width;
            window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
        };
    }, [active]);
}

export function SimSheet({ open, widgetKey, clinicName, onClose }: SheetProps) {
    const mounted = useMounted();
    useScrollLock(open);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!mounted) return null;
    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    key="sim-sheet"
                    className="sim-sheet-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.12 } }}
                    transition={{ duration: 0.25 }}
                >
                    <motion.div
                        className="sim-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Simulador de sonrisa · ${clinicName}`}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.5, ease: EASE }}
                    >
                        <SheetContent widgetKey={widgetKey} clinicName={clinicName} onClose={onClose} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}

function SheetContent({ widgetKey, clinicName, onClose }: Omit<SheetProps, "open">) {
    const [reloadKey, setReloadKey] = useState(0);
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const t = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 80);
        return () => window.clearTimeout(t);
    }, []);

    return (
        <>
            <header className="sim-sheet-bar">
                <div className="sim-sheet-brand">
                    <LogoMark size={34} variant="light" />
                    <div className="sim-sheet-names">
                        <strong>{clinicName}</strong>
                        <span><i aria-hidden />Simulador de sonrisa</span>
                    </div>
                </div>
                <div className="sim-sheet-tools">
                    <button
                        type="button"
                        className="sim-sheet-icon"
                        onClick={() => setReloadKey((k) => k + 1)}
                        aria-label="Reiniciar simulador"
                        title="Reiniciar"
                    >
                        <RotateCw size={18} aria-hidden />
                    </button>
                    <button ref={closeRef} type="button" className="sim-sheet-close" onClick={onClose}>
                        <X size={18} aria-hidden /> Cerrar
                    </button>
                </div>
            </header>
            <SheetFrame key={reloadKey} widgetKey={widgetKey} />
        </>
    );
}

/** Iframe con la altura disponible: el scroll ocurre dentro del widget. */
function SheetFrame({ widgetKey }: { widgetKey: string }) {
    const [loaded, setLoaded] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Al cambiar de paso (Datos → Foto → …) el widget embebido no se recoloca
    // solo: si el paciente había bajado, se vuelve arriba dentro del iframe.
    // El widget avisa en cada cambio con su mensaje de altura.
    useEffect(() => {
        let lastStep: string | null = null;
        const onMsg = (e: MessageEvent) => {
            const win = iframeRef.current?.contentWindow;
            if (!win || e.source !== win || e.origin !== window.location.origin) return;
            if (!e.data || e.data.type !== RESIZE_TYPE) return;
            try {
                const step = win.document.querySelector('[aria-current="step"]')?.textContent ?? null;
                if (lastStep !== null && step !== lastStep && win.scrollY > 0) {
                    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    win.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
                }
                lastStep = step;
            } catch { /* sin acceso al documento del iframe */ }
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
    }, []);

    return (
        <div className="sim-sheet-body">
            <iframe
                ref={iframeRef}
                src={widgetSrc(widgetKey)}
                title="Simulador de sonrisa"
                className={"sim-sheet-iframe" + (loaded ? " is-loaded" : "")}
                allow="camera; clipboard-write"
                onLoad={() => setLoaded(true)}
            />
            {!loaded && (
                <div className="sim-sheet-loading" aria-hidden>
                    <span className="sim-sheet-loading-ic"><Smile size={24} /></span>
                    <span className="sf-skeleton sim-sheet-loading-bar" />
                    <span className="sf-skeleton sim-sheet-loading-bar is-short" />
                </div>
            )}
        </div>
    );
}
