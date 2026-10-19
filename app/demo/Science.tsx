"use client";

import { useEffect, useRef, useState } from "react";

/* "Por qué funciona": el recorrido del paciente explicado con estudios
   publicados (ver docs/EVIDENCIA.md). Cada paso tiene una animación pequeña
   que se activa al entrar en pantalla. */

type Source = { label: string; href: string };

const SOURCES: Record<string, Source> = {
    ali: { label: "Ali, Abdulateef y Barzinji · Scientific Reports, 2026 · ensayo aleatorizado, 60 pacientes", href: "https://pubmed.ncbi.nlm.nih.gov/42457874/" },
    qadiri: { label: "Qadiri et al. · Cureus, 2026 · 80 pacientes", href: "https://pubmed.ncbi.nlm.nih.gov/42083663/" },
    olsen: { label: "Olsen e Inglehart · Am J Orthod Dentofacial Orthop, 2011 · 889 evaluadores", href: "https://pubmed.ncbi.nlm.nih.gov/22051487/" },
    pithon: { label: "Pithon et al. · Am J Orthod Dentofacial Orthop, 2014", href: "https://pubmed.ncbi.nlm.nih.gov/25263144/" },
    escalas: { label: "Escalas · Journal of Advertising, 2004 · simulación mental", href: "https://doi.org/10.1080/00913367.2004.10639163" },
    mourgues: { label: "Mourgues, González-Olmo et al. · Int J Dentistry, 2026 · Madrid, 51 participantes", href: "https://pubmed.ncbi.nlm.nih.gov/41487149/" },
    lekakis: { label: "Lekakis et al. · Facial Plastic Surgery, 2020 · 334 pacientes", href: "https://pubmed.ncbi.nlm.nih.gov/32092769/" },
    smink: { label: "Smink et al. · Electronic Commerce Research and Applications, 2019", href: "https://doi.org/10.1016/j.elerap.2019.100854" },
    tan: { label: "Tan, Chandukala y Reddy · Journal of Marketing, 2022", href: "https://doi.org/10.1177/0022242921995449" },
    hbr: { label: "Oldroyd, McElheran y Elkington · Harvard Business Review, 2011", href: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" },
};

/* ── Visuales de cada paso ─────────────────────────────────── */

function VisualSee() {
    return (
        <div className="sci-v sci-v-see" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/demo/preview-before.jpg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/demo/preview-after.jpg" alt="" className="after" />
            <span className="sci-seam" />
        </div>
    );
}

function VisualImagine() {
    const rows = ["Primera impresión", "Atractivo", "Confianza al sonreír"];
    return (
        <div className="sci-v sci-v-bars" aria-hidden="true">
            <span className="sci-illus">Ilustración</span>
            {rows.map((r, i) => (
                <div key={r} className="sci-bar-row">
                    <span>{r}</span>
                    <div className="sci-bar"><i style={{ animationDelay: `${0.2 + i * 0.15}s` }} /></div>
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
                <span className="sci-panel-row ghost" />
                <span className="sci-panel-row ghost" />
            </div>
            <div className="sci-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/demo/trans-2-after.jpg" alt="" />
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

const STEPS = [
    {
        verb: "Ver",
        title: "Ver el resultado reduce la duda",
        body: "Cuando el paciente ve una simulación de su propia sonrisa entiende mejor el tratamiento y confía más en dar el paso. En un ensayo aleatorizado, el grupo que vio la simulación puntuó más alto en comprensión, confianza y disposición a aceptar el tratamiento.",
        fact: "Ensayo aleatorizado: más comprensión y confianza con simulación",
        sources: ["ali", "qadiri"],
        Visual: VisualSee,
    },
    {
        verb: "Imaginar",
        title: "La decisión pasa de abstracta a personal",
        body: "Imaginarse usando algo aumenta la implicación emocional con la decisión. Y una sonrisa cuidada cambia cómo nos ven: en estudios con fotos, la misma cara se percibe más atractiva y competente.",
        fact: "La misma cara, mejor valorada con una sonrisa cuidada",
        sources: ["escalas", "olsen", "pithon"],
        Visual: VisualImagine,
    },
    {
        verb: "Confiar",
        title: "Expectativas realistas desde el inicio",
        body: "Un estudio en Madrid con simulaciones por IA mostró que mejoran cómo la persona ve su sonrisa, pero que la decisión necesita el acompañamiento de la clínica. Por eso la simulación es orientativa y tu equipo confirma la viabilidad en consulta.",
        fact: "Autopercepción de la sonrisa: de 5,8 a 7,0 sobre 10",
        sources: ["mourgues", "lekakis"],
        Visual: VisualTrust,
    },
    {
        verb: "Contactar",
        title: "Interés convertido en contacto",
        body: "Las herramientas para probar un resultado sobre tu propia cara resultan más informativas y aumentan la disposición a compartir datos con la marca. Funcionan mejor cuanto mayor es la incertidumbre, como en un tratamiento estético.",
        fact: "Probarlo en tu propia cara aumenta la disposición a dejar tus datos",
        sources: ["smink", "tan"],
        Visual: VisualContact,
    },
    {
        verb: "Responder",
        title: "La velocidad cierra el ciclo",
        body: "Las consultas online se enfrían rápido. Responder en la primera hora multiplica las opciones de que la conversación avance. El lead llega a tu panel al instante, con foto y WhatsApp, para que tu equipo llame mientras el interés está fresco.",
        fact: "Contactar en la primera hora: hasta 7 veces más probable calificar el lead",
        sources: ["hbr"],
        Visual: VisualRespond,
    },
];

function Step({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
    const ref = useRef<HTMLLIElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } },
            { threshold: 0.35 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    const { Visual } = step;
    return (
        <li ref={ref} className={`sci-step${inView ? " in" : ""}`}>
            <div className="sci-step-rail" aria-hidden="true">
                <span className="sci-dot">{index + 1}</span>
            </div>
            <div className="sci-step-body">
                <span className="sci-verb">{step.verb}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <p className="sci-fact">{step.fact}</p>
                <ul className="sci-src">
                    {step.sources.map((k) => (
                        <li key={k}>
                            <a href={SOURCES[k].href} target="_blank" rel="noopener noreferrer">{SOURCES[k].label}</a>
                        </li>
                    ))}
                </ul>
            </div>
            <Visual />
        </li>
    );
}

export function Science() {
    return (
        <section className="sci" aria-labelledby="sci-title">
            <div className="sfd-wrap">
                <div className="sci-head">
                    <p className="sfd-kicker">Por qué funciona</p>
                    <h2 id="sci-title">
                        La ciencia detrás de <em>verse antes de decidir.</em>
                    </h2>
                    <p>
                        Estudios publicados en odontología estética, psicología del consumidor y ventas explican por qué
                        una simulación personal trae pacientes con menos dudas, y qué parte le toca a tu equipo.
                    </p>
                </div>
                <ol className="sci-steps">
                    {STEPS.map((s, i) => <Step key={s.verb} step={s} index={i} />)}
                </ol>
                <p className="sci-disclaimer">
                    Los estudios se citan con su alcance real: muestras pequeñas y contextos distintos al tuyo. La simulación es orientativa;
                    el resultado clínico lo define la valoración de tu equipo.
                </p>
            </div>
        </section>
    );
}
