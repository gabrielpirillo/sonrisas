"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ChevronsLeftRight } from "lucide-react";
import WidgetContainer from "@/components/widget/WidgetContainer";
import { Wordmark } from "@/components/admin/qoves/LogoMark";
import { whatsappLink } from "@/lib/brand";

const CONTACT_HREF = whatsappLink("Hola, quiero saber más sobre Smile Fast para mi clínica.");
const SIGNUP_HREF = "/acceso?modo=registro";
import { Science } from "@/components/science/Science";
import "./demo.css";

/* Demo para clínicas: llega desde "Quiero probarlo" de la landing.
   Con ?embed=widget|full se comporta como antes (compatibilidad con embeds
   antiguos que apuntaban a la raíz). */

/** Comparador antes/después arrastrable (ratón, táctil y teclado). */
function Compare({ before, after, alt }: { before: string; after: string; alt: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState(50);
    const dragging = useRef(false);
    const touched = useRef(false);

    // Un barrido suave al cargar para mostrar que se puede arrastrar.
    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let raf = 0;
        const start = performance.now() + 700;
        const tick = (t: number) => {
            if (touched.current) return;
            const k = Math.min(1, Math.max(0, (t - start) / 1800));
            setPos(50 + 20 * Math.sin(k * Math.PI * 2)); // 50 → 70 → 30 → 50
            if (k < 1) raf = requestAnimationFrame(tick);
            else setPos(50);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    const moveTo = useCallback((clientX: number) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setPos(Math.min(97, Math.max(3, ((clientX - r.left) / r.width) * 100)));
    }, []);

    return (
        <div
            ref={ref}
            className="sfd-compare"
            style={{ ["--pos" as string]: `${pos}%` }}
            onPointerDown={(e) => {
                touched.current = true;
                dragging.current = true;
                (e.target as Element).setPointerCapture?.(e.pointerId);
                moveTo(e.clientX);
            }}
            onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={before} alt={`${alt}, antes`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={after} alt={`${alt}, simulación`} className="after" />
            <span className="sfd-tag before">Antes</span>
            <span className="sfd-tag after">Después · simulación</span>
            <div className="sfd-handle">
                <button
                    type="button"
                    role="slider"
                    aria-label="Comparar antes y después"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pos)}
                    onKeyDown={(e) => {
                        if (e.key === "ArrowLeft") { touched.current = true; setPos((p) => Math.max(3, p - 5)); }
                        if (e.key === "ArrowRight") { touched.current = true; setPos((p) => Math.min(97, p + 5)); }
                    }}
                >
                    <ChevronsLeftRight size={22} />
                </button>
            </div>
        </div>
    );
}

function Pair({ before, after }: { before: string; after: string }) {
    return (
        <figure className="sfd-pair">
            <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={before} alt="Antes" loading="lazy" />
                <span className="sfd-tag before">Antes</span>
            </div>
            <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={after} alt="Después (simulación)" loading="lazy" />
                <span className="sfd-tag after">Después</span>
            </div>
        </figure>
    );
}

function DemoContent() {
    const searchParams = useSearchParams();
    const embedMode = searchParams.get("embed"); // 'full' | 'widget' | null
    const isWidgetMode = embedMode === "widget";

    useEffect(() => {
        if (isWidgetMode) {
            document.documentElement.style.setProperty("background", "transparent", "important");
            document.body.style.setProperty("background", "transparent", "important");
        }
    }, [isWidgetMode]);

    if (embedMode) {
        return (
            <main style={{ background: isWidgetMode ? "transparent" : "#fff" }}>
                <WidgetContainer />
            </main>
        );
    }

    return (
        <div className="sfd">
            <header className="sfd-top">
                <div className="sfd-wrap">
                    <a href="/" aria-label="Smile Fast — inicio"><Wordmark height={22} /></a>
                    <nav aria-label="Principal">
                        <a href="/" className="hide-sm sfd-back">
                            <ArrowLeft size={15} /> Volver a la web
                        </a>
                        <Link href="/acceso" className="hide-sm">Acceder</Link>
                        <a href={CONTACT_HREF} target="_blank" rel="noopener noreferrer" className="hide-sm">Contactarnos</a>
                        <Link href={SIGNUP_HREF} className="sfd-btn sfd-btn-dark sfd-btn-sm">Crear cuenta</Link>
                    </nav>
                </div>
            </header>

            <main>
                <section className="sfd-hero">
                    <div className="sfd-wrap">
                        <div>
                            <p className="sfd-kicker sfd-in">Demo para clínicas dentales</p>
                            <h1 className="sfd-in sfd-in-2">
                                Así verá tu paciente <em>su nueva sonrisa.</em>
                            </h1>
                            <p className="sfd-lead sfd-in sfd-in-3">
                                Sube una selfie al widget, igual que lo haría alguien desde la web de tu clínica, y mira la simulación que recibe.
                            </p>
                            <div className="sfd-actions sfd-in sfd-in-3">
                                <a href="#probar" className="sfd-btn sfd-btn-dark">
                                    Probar con mi foto <ArrowDown size={16} />
                                </a>
                                <Link href={SIGNUP_HREF} className="sfd-btn sfd-btn-line">Crear cuenta</Link>
                            </div>
                            <div className="sfd-facts sfd-in sfd-in-3">
                                <div><strong>Solo una selfie</strong>Sin descargar nada, desde el móvil o el ordenador.</div>
                                <div><strong>Lead en tu panel</strong>Nombre, contacto y simulación quedan guardados.</div>
                                <div><strong>En tu web</strong>Se instala pegando un código.</div>
                            </div>
                        </div>
                        <div className="sfd-in sfd-in-2">
                            <Compare before="/brand/demo/trans-1-before.jpg" after="/brand/demo/trans-1-after.jpg" alt="Paciente sonriendo" />
                        </div>
                    </div>
                </section>

                <section className="sfd-try" id="probar">
                    <div className="sfd-wrap">
                        <div className="sfd-try-head sfd-try-head-solo">
                            <h2>Pruébalo tal como aparece en la web de tu clínica.</h2>
                        </div>
                        <ol className="sfd-steps">
                            <li><span><strong>Deja tus datos</strong>Nombre y correo, para enviarte el resultado.</span></li>
                            <li><span><strong>Sube una selfie</strong>De frente y sonriendo, con buena luz.</span></li>
                            <li><span><strong>Mira tu simulación</strong>Compara antes y después en la misma pantalla.</span></li>
                        </ol>
                        <div className="sfd-browser">
                            <div className="sfd-browser-bar">
                                <div className="sfd-dots" aria-hidden="true"><i /><i /><i /></div>
                                <div className="sfd-url">www.tuclinica.com/simulador-de-sonrisa</div>
                            </div>
                            <div className="sfd-site-nav" aria-hidden="true">
                                <b>Tu Clínica Dental</b>
                                <span><span>Tratamientos</span><span>Equipo</span><span>Contacto</span></span>
                            </div>
                            <WidgetContainer />
                        </div>
                    </div>
                </section>

                <Science />

                <section className="sfd-more">
                    <div className="sfd-wrap">
                        <h2>Más ejemplos de simulación</h2>
                        <p>Foto original a la izquierda, simulación a la derecha.</p>
                        <div className="sfd-pairs">
                            <Pair before="/brand/demo/trans-2-before.jpg" after="/brand/demo/trans-2-after.jpg" />
                            <Pair before="/brand/demo/preview-before.jpg" after="/brand/demo/preview-after.jpg" />
                        </div>
                    </div>
                </section>

                <section className="sfd-close">
                    <div className="sfd-wrap">
                        <div>
                            <h2>¿Lo quieres en la web de <em>tu clínica?</em></h2>
                            <p>Crea tu cuenta y activa el widget en tu web en 1 día.</p>
                        </div>
                        <div className="sfd-actions">
                            <Link href={SIGNUP_HREF} className="sfd-btn sfd-btn-white">Crear cuenta</Link>
                            <a href={CONTACT_HREF} target="_blank" rel="noopener noreferrer" className="sfd-btn sfd-btn-line">Escribirnos por WhatsApp</a>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="sfd-foot">
                <div className="sfd-wrap">
                    <span>© {new Date().getFullYear()} Smile Fast</span>
                    <Link href="/acceso">Acceso para clínicas</Link>
                </div>
            </footer>
        </div>
    );
}

export default function DemoPage() {
    return (
        <Suspense>
            <DemoContent />
        </Suspense>
    );
}
