"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
    ArrowRight, Camera, Coins, Glasses, Info, Lock, Maximize2, Monitor, RotateCw,
    ScanFace, Smartphone, Smile, Sparkles, Sun, UserRound, X,
} from "lucide-react";
import { Wordmark } from "@/components/admin/qoves/LogoMark";
import { useMounted } from "@/components/panel/credits/useMounted";
import "./simulator.css";

type Device = "desktop" | "mobile";

const RESIZE_TYPE = "smileforward-resize";
const MIN_H = 480;
const MAX_H = 4000;
/** Por debajo de este número de simulaciones restantes se avisa de recargar. */
const LOW_SIMS = 10;
const EASE = [0.22, 1, 0.36, 1] as const;

type Props = {
    widgetKey: string;
    clinicName: string;
    balance: number;
    imageCost: number | null;
    canRecharge: boolean;
    impersonating: boolean;
};

/* ------------------------------------------------------------------ */
/* Pantalla completa (con prefijo webkit para Safari en iPad)           */
/* ------------------------------------------------------------------ */
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function fullscreenElement(): Element | null {
    const d = document as FsDoc;
    return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}
async function enterFullscreen(el: HTMLElement): Promise<boolean> {
    const e = el as FsEl;
    try {
        if (e.requestFullscreen) { await e.requestFullscreen({ navigationUI: "hide" }); return true; }
        if (e.webkitRequestFullscreen) { await e.webkitRequestFullscreen(); return true; }
    } catch { /* p. ej. iPhone: sin API para elementos que no son vídeo */ }
    return false;
}
function exitFullscreen() {
    const d = document as FsDoc;
    try {
        if (d.fullscreenElement && d.exitFullscreen) void d.exitFullscreen();
        else if (d.webkitFullscreenElement && d.webkitExitFullscreen) void d.webkitExitFullscreen();
    } catch { /* ya no estaba en pantalla completa */ }
}

/* ------------------------------------------------------------------ */

export function SimulatorStudio(props: Props) {
    return (
        <MotionConfig reducedMotion="user">
            <SimulatorInner {...props} />
        </MotionConfig>
    );
}

function SimulatorInner({ widgetKey, clinicName, balance, imageCost, canRecharge, impersonating }: Props) {
    const router = useRouter();
    const [device, setDevice] = useState<Device>("desktop");
    const [presenting, setPresenting] = useState(false);
    const [nativeFs, setNativeFs] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const showRef = useRef<HTMLDivElement>(null);
    const exitBtnRef = useRef<HTMLButtonElement>(null);

    // Modo presentación = capa fija a pantalla completa dentro de la página.
    // Además se pide la pantalla completa del navegador (oculta barras), pero si
    // el navegador la cierra (p. ej. al abrir el selector de fotos) la capa sigue
    // y el paciente no pierde nada: solo se sale con "Salir" o Esc.
    const startPresenting = useCallback(async () => {
        setPresenting(true);
        const ok = await enterFullscreen(document.documentElement);
        setNativeFs(ok);
    }, []);

    const stopPresenting = useCallback(() => {
        if (fullscreenElement()) exitFullscreen();
        setPresenting(false);
        setNativeFs(false);
        // El saldo puede haber cambiado tras las simulaciones de la demo.
        router.refresh();
    }, [router]);

    useEffect(() => {
        if (!presenting) return;
        const onFs = () => setNativeFs(Boolean(fullscreenElement()));
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !fullscreenElement()) stopPresenting(); };
        document.addEventListener("fullscreenchange", onFs);
        document.addEventListener("webkitfullscreenchange", onFs);
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const t = window.setTimeout(() => exitBtnRef.current?.focus({ preventScroll: true }), 60);
        return () => {
            document.removeEventListener("fullscreenchange", onFs);
            document.removeEventListener("webkitfullscreenchange", onFs);
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
            window.clearTimeout(t);
        };
    }, [presenting, stopPresenting]);

    const restart = () => {
        setReloadKey((k) => k + 1);
        router.refresh();
    };

    return (
        <>
            <Hero
                balance={balance}
                imageCost={imageCost}
                canRecharge={canRecharge}
                onPresent={startPresenting}
            />

            <StepsGuide />

            <section className={"card sim-stage-card" + (presenting ? " is-presenting" : "")} aria-labelledby="sim-stage-title">
                <div className="sim-toolbar">
                    <div className="sim-toolbar-title">
                        <span className="mono">SIMULADOR</span>
                        <h2 id="sim-stage-title">Úsalo ahora, <span>con tu paciente</span></h2>
                    </div>
                    <div className="sim-toolbar-tools">
                        <DeviceToggle device={device} onChange={setDevice} />
                        <button type="button" className="icon-btn" onClick={restart} aria-label="Reiniciar simulador" title="Reiniciar simulador">
                            <RotateCw size={16} />
                        </button>
                        <button type="button" className="btn btn-primary btn-sm sim-present-btn" onClick={startPresenting}>
                            <Maximize2 size={15} aria-hidden /> Modo presentación
                        </button>
                    </div>
                </div>

                {impersonating && (
                    <p className="sim-imp-note" role="note">
                        <Info size={14} aria-hidden />
                        Estás impersonando: lo que hagas aquí consume créditos reales de esta clínica.
                    </p>
                )}

                {/* Este contenedor es el que pasa a pantalla completa: el iframe
                    nunca se desmonta, así la sesión del paciente no se pierde. */}
                <div
                    ref={showRef}
                    className={"sim-show" + (presenting ? " is-presenting is-overlay" : "") + (nativeFs ? " is-native" : "")}
                    role={presenting ? "dialog" : undefined}
                    aria-modal={presenting ? true : undefined}
                    aria-label={presenting ? "Modo presentación del simulador" : undefined}
                >
                    {presenting && (
                        <div className="sim-show-bar">
                            <div className="sim-show-brand">
                                <Wordmark tone="light" height={20} />
                                <span className="sim-show-sep" aria-hidden />
                                <span className="sim-show-clinic">{clinicName}</span>
                            </div>
                            <button ref={exitBtnRef} type="button" className="sim-exit" onClick={stopPresenting}>
                                <X size={16} aria-hidden /> <span>Salir</span> <kbd>Esc</kbd>
                            </button>
                        </div>
                    )}
                    {presenting && <span className="sim-show-glow" aria-hidden />}

                    <div className="sim-stage">
                        <span className="sim-stage-grid" aria-hidden />
                        <LiveWidget key={reloadKey} widgetKey={widgetKey} device={device} presenting={presenting} />
                    </div>

                    {presenting && (
                        <p className="sim-show-foot">Simulación orientativa generada con IA · {clinicName}</p>
                    )}
                </div>

                <p className="sim-note">
                    <Info size={13} aria-hidden />
                    <span>
                        Es el simulador real: cada simulación consume
                        {imageCost ? ` ${imageCost} ${imageCost === 1 ? "crédito" : "créditos"}` : " créditos"} de tu saldo
                        y los datos del paciente se guardan como lead.
                    </span>
                </p>
            </section>

            <PhotoTips />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */
function Hero({
    balance, imageCost, canRecharge, onPresent,
}: { balance: number; imageCost: number | null; canRecharge: boolean; onPresent: () => void }) {
    const mounted = useMounted();
    const sims = imageCost ? Math.floor(Math.max(0, balance) / imageCost) : null;
    const empty = sims !== null ? sims <= 0 : balance <= 0;
    const low = sims !== null ? sims < LOW_SIMS : balance < LOW_SIMS;

    return (
        <section className={"sim-hero" + (low ? " is-low" : "")} aria-labelledby="sim-hero-title">
            <span className="sim-hero-orb" aria-hidden />
            <span className="sim-hero-orb sim-hero-orb-2" aria-hidden />
            <span className="sim-hero-grid" aria-hidden />

            <div className="sim-hero-main">
                <h1 id="sim-hero-title" className="sim-hero-title">
                    Enséñale su nueva sonrisa <span className="sim-shine">antes de empezar</span>
                </h1>
                <p className="sim-hero-lead">
                    El mismo simulador que ven tus pacientes en tu web, listo para usarlo en consulta
                    o para lucirlo en una demo. Tres pasos y menos de un minuto.
                </p>
                <div className="sim-hero-actions">
                    <button type="button" className="btn btn-light sim-hero-cta" onClick={onPresent}>
                        <Maximize2 size={16} aria-hidden /> Modo presentación
                    </button>
                    <a href="#sim-stage-title" className="sim-hero-link">
                        Usar aquí <ArrowRight size={15} aria-hidden />
                    </a>
                </div>
            </div>

            <div className="sim-hero-side">
                <div className="sim-credit" role="group" aria-label="Saldo de créditos">
                    <span className="sim-credit-ic" aria-hidden><Coins size={17} /></span>
                    <div className="sim-credit-body">
                        <span className="mono">TE QUEDAN</span>
                        <strong>
                            {sims === null ? (
                                <>
                                    <NumberFlow value={mounted ? balance : 0} locales="es" aria-hidden />
                                    <span className="sr-only">{balance}</span> créditos
                                </>
                            ) : (
                                <>
                                    ≈ <NumberFlow value={mounted ? sims : 0} locales="es" aria-hidden />
                                    <span className="sr-only">{sims}</span> {sims === 1 ? "simulación" : "simulaciones"}
                                </>
                            )}
                        </strong>
                        <span className="sim-credit-sub">
                            {balance.toLocaleString("es")} {balance === 1 ? "crédito" : "créditos"}
                            {imageCost ? ` · ${imageCost} por simulación` : ""}
                        </span>
                    </div>
                </div>
                {low && (
                    <div className="sim-low" role="status">
                        <span className="sim-low-dot" aria-hidden />
                        <span>{empty ? "Sin saldo: el simulador no podrá generar resultados." : "Saldo bajo para una demo larga."}</span>
                        {canRecharge && (
                            <Link href="/administracion/creditos" className="sim-low-link">
                                Recargar <ArrowRight size={13} aria-hidden />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Guía de 3 pasos                                                      */
/* ------------------------------------------------------------------ */
const STEPS: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <UserRound size={20} />, title: "Datos", text: "Nombre y contacto del paciente. Quedan guardados como lead." },
    { icon: <Camera size={20} />, title: "Foto", text: "Una foto de frente sonriendo, con la cámara o desde la galería." },
    { icon: <Sparkles size={20} />, title: "Resultado", text: "La IA muestra el antes y el después en segundos." },
];

function StepsGuide() {
    return (
        <section className="sim-steps" aria-label="Cómo funciona">
            <ol className="sim-steps-list">
                {STEPS.map((s, i) => {
                    return (
                        <li key={s.title} className="sim-step">
                            <span className="sim-step-ic" aria-hidden>{s.icon}</span>
                            <div className="sim-step-body">
                                <span className="mono">PASO {i + 1}</span>
                                <strong>{s.title}</strong>
                                <p>{s.text}</p>
                            </div>
                            {i < STEPS.length - 1 && (
                                <span className="sim-step-link" aria-hidden>
                                    <i style={{ transform: "none" }} />
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Selector Móvil / Escritorio                                          */
/* ------------------------------------------------------------------ */
function DeviceToggle({ device, onChange }: { device: Device; onChange: (d: Device) => void }) {
    const opts: { id: Device; label: string; icon: ReactNode }[] = [
        { id: "mobile", label: "Móvil", icon: <Smartphone size={15} aria-hidden /> },
        { id: "desktop", label: "Escritorio", icon: <Monitor size={15} aria-hidden /> },
    ];
    return (
        <div className="sim-seg" role="radiogroup" aria-label="Ancho del simulador">
            {opts.map((o) => {
                const on = device === o.id;
                return (
                    <button key={o.id} type="button" role="radio" aria-checked={on} className={on ? "is-on" : ""} onClick={() => onChange(o.id)}>
                        {on && <motion.span layoutId="sim-seg-pill" className="sim-seg-pill" transition={{ type: "spring", stiffness: 460, damping: 36 }} />}
                        <span className="sim-seg-label">{o.icon}{o.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Widget real en un marco de navegador o de móvil                      */
/* ------------------------------------------------------------------ */
function LiveWidget({ widgetKey, device, presenting }: { widgetKey: string; device: Device; presenting: boolean }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(760);
    const [loaded, setLoaded] = useState(false);
    // El iframe se monta solo en el cliente: así el listener de altura y onLoad
    // ya existen cuando el widget carga (con SSR podía cargar antes de hidratar).
    const mounted = useMounted();
    const src = `/widget?key=${encodeURIComponent(widgetKey)}&embed=widget`;

    // El widget avisa su altura; solo aceptamos mensajes de NUESTRO iframe.
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.source !== iframeRef.current?.contentWindow) return;
            if (e.origin !== window.location.origin) return;
            if (!e.data || e.data.type !== RESIZE_TYPE) return;
            const h = parseInt(String(e.data.height), 10);
            if (h > 0) { setHeight(Math.max(MIN_H, Math.min(h, MAX_H))); setLoaded(true); }
        };
        window.addEventListener("message", onMsg);
        return () => window.removeEventListener("message", onMsg);
    }, []);

    const showChrome = device === "desktop" && !presenting;

    return (
        <div className={"sim-frame sim-frame-" + device + (presenting ? " is-presenting" : "")}>
            <AnimatePresence initial={false}>
                {showChrome && (
                    <motion.div
                        key="chrome"
                        className="sim-chrome"
                        aria-hidden
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 40, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                    >
                        <span className="sim-chrome-dots"><i /><i /><i /></span>
                        <span className="sim-chrome-url"><Lock size={10} /> tu-clinica.com/simulador</span>
                    </motion.div>
                )}
            </AnimatePresence>
            {device === "mobile" && <span className="sim-notch" aria-hidden />}
            <div className="sim-screen">
                {mounted && (
                <iframe
                    ref={iframeRef}
                    src={src}
                    title="Simulador de sonrisa"
                    className={"sim-iframe" + (loaded ? " is-loaded" : "")}
                    style={{ height }}
                    allow="camera; clipboard-write"
                    onLoad={() => setLoaded(true)}
                />
                )}
                {!loaded && (
                    <div className="sim-loading" aria-hidden>
                        <span className="sim-loading-ic"><Smile size={22} /></span>
                        <span className="sf-skeleton sim-loading-bar" />
                        <span className="sf-skeleton sim-loading-bar is-short" />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Consejos para una buena foto                                         */
/* ------------------------------------------------------------------ */
const TIPS: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <Sun size={20} />, title: "Luz frontal", text: "Que la luz le dé de frente, mejor natural. Evita contraluces y sombras en la boca." },
    { icon: <Smile size={20} />, title: "Sonrisa natural", text: "Sonrisa amplia y relajada, mostrando los dientes de arriba. Sin forzarla." },
    { icon: <Glasses size={20} />, title: "Sin lentes de sol", text: "Cara despejada: sin lentes de sol, gorras ni pelo tapando el rostro." },
    { icon: <ScanFace size={20} />, title: "De frente y cerca", text: "Cámara a la altura de los ojos, rostro centrado y enfocado." },
];

function PhotoTips() {
    return (
        <section className="sim-tips" aria-labelledby="sim-tips-title">
            <div className="sim-tips-head">
                <span className="mono">CONSEJOS</span>
                <h2 id="sim-tips-title">Una buena foto, <span>un gran resultado</span></h2>
            </div>
            <ul className="sim-tips-grid">
                {TIPS.map((t, i) => (
                    <motion.li
                        key={t.title}
                        className="sim-tip"
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.55, ease: EASE, delay: 0.07 * i }}
                    >
                        <span className="sim-tip-ic" aria-hidden>{t.icon}</span>
                        <strong>{t.title}</strong>
                        <p>{t.text}</p>
                        <span className="sim-tip-num mono" aria-hidden>0{i + 1}</span>
                    </motion.li>
                ))}
            </ul>
        </section>
    );
}
