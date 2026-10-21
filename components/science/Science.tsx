/* "La ciencia detrás de verse antes de decidir".
   Componente compartido por la app Next (/demo) y la landing (Vite): no usa
   nada propio de Next. Contenido y fuentes: docs/EVIDENCIA.md. */
/* eslint-disable @next/next/no-img-element -- también se compila con Vite (landing): sin next/image */
import { useEffect, useRef, useState, type ReactElement } from "react";
import "./science.css";

type Source = { label: string; href: string };
type Step = {
    verb: string;
    title: string;
    lead: string;
    points: string[];
    stat: { value?: string; label: string };
    sources: Source[];
    Visual: () => ReactElement;
};

const IMG = "/brand/demo";

function VisualSee() {
    return (
        <div className="sci-v sci-v-see" aria-hidden="true">
            <img src={`${IMG}/preview-before.jpg`} alt="" />
            <img src={`${IMG}/preview-after.jpg`} alt="" className="after" />
            <span className="sci-seam" />
            <span className="sci-tag l">Antes</span>
            <span className="sci-tag r">Simulación</span>
        </div>
    );
}

function VisualImagine() {
    const rows = ["Primera impresión", "Atractivo", "Confianza al sonreír"];
    return (
        <div className="sci-v sci-v-bars" aria-hidden="true">
            <span className="sci-illus">Ilustración</span>
            {rows.map((r) => (
                <div key={r} className="sci-bar-row">
                    <span>{r}</span>
                    <div className="sci-bar"><i /></div>
                </div>
            ))}
        </div>
    );
}

function VisualTrust() {
    return (
        <div className="sci-v sci-v-trust" aria-hidden="true">
            <span className="sci-chip">Simulación orientativa</span>
            <span className="sci-arrow" />
            <span className="sci-chip sci-chip-dark">Valoración en consulta</span>
        </div>
    );
}

function VisualContact() {
    return (
        <div className="sci-v sci-v-lead" aria-hidden="true">
            <div className="sci-panel">
                <span className="sci-panel-row" />
                <span className="sci-panel-row" />
            </div>
            <div className="sci-card">
                <img src={`${IMG}/trans-2-after.jpg`} alt="" />
                <span><b>Nuevo lead</b><small>Foto + WhatsApp</small></span>
            </div>
        </div>
    );
}

function VisualRespond() {
    return (
        <div className="sci-v sci-v-time" aria-hidden="true">
            <span className="sci-illus">Ilustración</span>
            <div className="sci-time-row">
                <span>Primera hora</span>
                <div className="sci-time"><i className="hot" /></div>
            </div>
            <div className="sci-time-row">
                <span>Al día siguiente</span>
                <div className="sci-time"><i className="cold" /></div>
            </div>
        </div>
    );
}

const STEPS: Step[] = [
    {
        verb: "Ver",
        title: "Ver el resultado reduce la duda",
        lead: "Quien ve su propia sonrisa simulada entiende mejor el tratamiento y se anima a dar el paso.",
        points: ["Más comprensión del tratamiento", "Más confianza en el resultado", "Más disposición a aceptarlo"],
        stat: { value: "5 de 5", label: "indicadores mejoraron en el grupo que vio la simulación (ensayo aleatorizado, 60 pacientes)" },
        sources: [
            { label: "Ali, Abdulateef y Barzinji · Scientific Reports, 2026", href: "https://pubmed.ncbi.nlm.nih.gov/42457874/" },
            { label: "Qadiri et al. · Cureus, 2026", href: "https://pubmed.ncbi.nlm.nih.gov/42083663/" },
        ],
        Visual: VisualSee,
    },
    {
        verb: "Imaginar",
        title: "La decisión pasa de abstracta a personal",
        lead: "Verse con la nueva sonrisa hace que la decisión deje de ser teórica.",
        points: ["Imaginar el resultado aumenta la implicación", "Una sonrisa cuidada mejora la primera impresión", "Se percibe más atractiva y competente"],
        stat: { value: "889", label: "evaluadores: la misma cara con una sonrisa cuidada fue la mejor valorada" },
        sources: [
            { label: "Olsen e Inglehart · Am J Orthod Dentofacial Orthop, 2011", href: "https://pubmed.ncbi.nlm.nih.gov/22051487/" },
            { label: "Pithon et al. · Am J Orthod Dentofacial Orthop, 2014", href: "https://pubmed.ncbi.nlm.nih.gov/25263144/" },
            { label: "Escalas · Journal of Advertising, 2004", href: "https://doi.org/10.1080/00913367.2004.10639163" },
        ],
        Visual: VisualImagine,
    },
    {
        verb: "Confiar",
        title: "Expectativas realistas desde el inicio",
        lead: "La simulación orienta; tu equipo confirma. Así el paciente llega a consulta con la idea correcta.",
        points: ["Mejora cómo la persona ve su sonrisa", "La decisión se apoya en tu criterio clínico", "La viabilidad se confirma en consulta"],
        stat: { value: "5,8 → 7,0", label: "autopercepción de la sonrisa (sobre 10) tras ver una simulación por IA · Madrid, 2026" },
        sources: [
            { label: "Mourgues, González-Olmo et al. · Int J Dentistry, 2026", href: "https://pubmed.ncbi.nlm.nih.gov/41487149/" },
            { label: "Lekakis et al. · Facial Plastic Surgery, 2020", href: "https://pubmed.ncbi.nlm.nih.gov/32092769/" },
        ],
        Visual: VisualTrust,
    },
    {
        verb: "Contactar",
        title: "El interés se convierte en contacto",
        lead: "Después de verse, dejar sus datos es el paso natural.",
        points: ["La experiencia se percibe más informativa", "Aumenta la disposición a compartir datos", "Pesa más cuanto más importante es la decisión"],
        stat: { label: "Probar un resultado sobre tu propia cara funciona mejor cuanto mayor es la incertidumbre, como en un tratamiento estético." },
        sources: [
            { label: "Smink et al. · Electronic Commerce Research and Applications, 2019", href: "https://doi.org/10.1016/j.elerap.2019.100854" },
            { label: "Tan, Chandukala y Reddy · Journal of Marketing, 2022", href: "https://doi.org/10.1177/0022242921995449" },
        ],
        Visual: VisualContact,
    },
    {
        verb: "Responder",
        title: "La velocidad cierra el ciclo",
        lead: "El interés se enfría en horas: quien responde primero, conversa.",
        points: ["El lead llega a tu panel al instante", "Con foto, contacto y WhatsApp", "Tu equipo llama mientras el interés está fresco"],
        stat: { value: "7×", label: "más probable calificar un lead si se contacta en la primera hora" },
        sources: [{ label: "Oldroyd, McElheran y Elkington · Harvard Business Review, 2011", href: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" }],
        Visual: VisualRespond,
    },
];

function useInView<T extends Element>(threshold = 0.3) {
    const ref = useRef<T>(null);
    // Sin IntersectionObserver (navegadores muy viejos) se muestra todo de entrada.
    const [inView, setInView] = useState(() => typeof window !== "undefined" && typeof IntersectionObserver === "undefined");
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold });
        io.observe(el);
        return () => io.disconnect();
    }, [threshold]);
    return [ref, inView] as const;
}

function StepItem({ step, index }: { step: Step; index: number }) {
    const [ref, inView] = useInView<HTMLLIElement>(0.3);
    const { Visual } = step;
    return (
        <li ref={ref} className={`sci-step${inView ? " in" : ""}`}>
            <div className="sci-rail" aria-hidden="true"><span className="sci-dot">{index + 1}</span></div>
            <div className="sci-body">
                <span className="sci-verb">{step.verb}</span>
                <h3>{step.title}</h3>
                <p className="sci-lead">{step.lead}</p>
                <ul className="sci-points">
                    {step.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <div className={`sci-stat${step.stat.value ? "" : " sci-stat-text"}`}>
                    {step.stat.value && <strong>{step.stat.value}</strong>}
                    <span>{step.stat.label}</span>
                </div>
                <details className="sci-src">
                    <summary>{step.sources.length === 1 ? "Ver el estudio" : `Ver los ${step.sources.length} estudios`}</summary>
                    <ul>
                        {step.sources.map((s) => (
                            <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                        ))}
                    </ul>
                </details>
            </div>
            <Visual />
        </li>
    );
}

export function Science({ className = "", collapsible = false }: { className?: string; collapsible?: boolean }) {
    const [headRef, headIn] = useInView<HTMLDivElement>(0.2);
    // Desplegable (landing): resumen siempre visible; el detalle se abre a pedido
    // para no cortar el recorrido de la página.
    const [open, setOpen] = useState(!collapsible);
    // "inert" a mano: la landing usa React 18, que no conoce el atributo.
    const detailRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = detailRef.current;
        if (!el) return;
        if (open) el.removeAttribute("inert");
        else el.setAttribute("inert", "");
    }, [open]);
    const steps = (
        <ol className="sci-steps">
            {STEPS.map((s, i) => <StepItem key={s.verb} step={s} index={i} />)}
        </ol>
    );
    return (
        <section className={`sci ${className}${collapsible ? " sci-collapsible" : ""}${open ? " is-open" : ""}`} aria-labelledby="sci-title">
            <div className="sci-wrap">
                <div ref={headRef} className={`sci-head${headIn ? " in" : ""}`}>
                    <p className="sci-kicker">Por qué funciona</p>
                    <h2 id="sci-title">La ciencia detrás de <em>verse antes de decidir.</em></h2>
                    <p>Cinco pasos respaldados por estudios en odontología estética, psicología del consumidor y ventas.</p>
                    <ol className="sci-journey" aria-label="Resumen del recorrido">
                        {STEPS.map((s, i) => <li key={s.verb} style={{ transitionDelay: `${0.15 + i * 0.08}s` }}><b>{i + 1}</b>{s.verb}</li>)}
                    </ol>
                </div>
                {collapsible ? (
                    <>
                        <button
                            type="button"
                            className="sci-toggle"
                            aria-expanded={open}
                            aria-controls="sci-detail"
                            onClick={() => setOpen((o) => !o)}
                        >
                            <span className="sci-toggle-txt">
                                <b>{open ? "Ocultar la evidencia" : "Ver la evidencia paso a paso"}</b>
                                <small>5 pasos · estudios citados con su fuente</small>
                            </span>
                            <span className="sci-toggle-ic" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                            </span>
                        </button>
                        <div id="sci-detail" className="sci-detail" ref={detailRef}>
                            <div className="sci-detail-in">
                                {steps}
                                <p className="sci-disclaimer">
                                    Citamos cada estudio con su alcance real: muestras pequeñas y contextos distintos al tuyo. La simulación es orientativa;
                                    el resultado clínico lo define la valoración de tu equipo.
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {steps}
                        <p className="sci-disclaimer">
                            Citamos cada estudio con su alcance real: muestras pequeñas y contextos distintos al tuyo. La simulación es orientativa;
                            el resultado clínico lo define la valoración de tu equipo.
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}

export default Science;
