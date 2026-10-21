"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ProcessStatus } from "../types";
import { fileObjectUrl } from "../objectUrl";
import "./processing-step.css";

interface ProcessingStepProps {
    image: File | null;
    processStatus: ProcessStatus;
    isDesktop: boolean;
}

// Orden real del pipeline (useWidgetState).
const ORDER: ProcessStatus[] = ["idle", "validating", "scanning", "analyzing", "designing", "aligning", "complete"];

/** Etapas visibles (índice en ORDER = 1…5). "complete" ⇒ todas hechas. */
const STAGES: { status: ProcessStatus; label: string; title: string; desc: string }[] = [
    { status: "validating", label: "Validación de la foto", title: "Verificando tu foto", desc: "Comprobamos encuadre, luz y nitidez." },
    { status: "scanning", label: "Mapeo facial", title: "Mapeando tu rostro", desc: "Localizamos los puntos de referencia de tu cara." },
    { status: "analyzing", label: "Análisis de proporciones", title: "Analizando tus proporciones", desc: "Simetría, línea media y armonía de tu sonrisa." },
    { status: "designing", label: "Diseño de tu sonrisa", title: "Diseñando tu nueva sonrisa", desc: "Creamos una propuesta natural, a la medida de tu rostro." },
    { status: "aligning", label: "Ajuste final", title: "Preparando tu resultado", desc: "Alineamos la simulación con tu foto original." },
];
const DONE_COPY = { title: "Tu simulación está lista", desc: "Abriendo tu resultado…" };
/** Si el diseño (la etapa más larga) se alarga, cambiamos el texto para tranquilizar. */
const SLOW_DESC = "Estamos cuidando cada detalle. Solo unos segundos más…";
const SLOW_AFTER_MS = 14000;

/**
 * Progreso por etapa: [desde, tope, τ en s]. Dentro de cada etapa la barra se
 * acerca al tope de forma asintótica (cada vez más despacio, nunca se queda
 * clavada ni llega al final) y solo completa cuando el pipeline termina.
 */
const PROGRESS: Record<ProcessStatus, [number, number, number]> = {
    idle: [0, 10, 2],
    validating: [2, 14, 2.5],
    scanning: [14, 30, 3],
    analyzing: [30, 50, 5],
    designing: [50, 90, 16],
    aligning: [90, 96, 2],
    complete: [100, 100, 0.18],
};

function useSmoothProgress(status: ProcessStatus, reduce: boolean) {
    const fillRef = useRef<HTMLSpanElement>(null);
    const value = useRef(0);

    useEffect(() => {
        const el = fillRef.current;
        if (!el) return;
        const [from, to, tau] = PROGRESS[status] ?? PROGRESS.idle;
        const paint = (v: number) => { el.style.transform = `scaleX(${v / 100})`; };

        if (reduce) {
            value.current = status === "complete" ? 100 : Math.max(value.current, (from + to) / 2);
            paint(value.current);
            return;
        }

        const start = Math.max(value.current, from);
        const t0 = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const t = (now - t0) / 1000;
            let v = start + (to - start) * (1 - Math.exp(-t / tau));
            if (status === "complete" && v > 99.6) v = 100;
            value.current = Math.max(value.current, v);
            paint(value.current);
            if (value.current < to) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [status, reduce]);

    return fillRef;
}

/**
 * Capa de mapeo facial. viewBox 3:4 (proporción típica de un selfie) con
 * "slice", igual que el object-fit: cover de la foto, para que ambos escalen
 * igual. Los elementos aparecen según la etapa (data-stage en el contenedor).
 */
function FaceMap() {
    const pts: [number, number][] = [
        [112, 168], [188, 168], // pupilas
        [150, 214], // punta nasal
        [124, 254], [176, 254], // comisuras
        [150, 247], [150, 266], // labios
        [150, 318], // mentón
        [92, 196], [208, 196], // pómulos
        [100, 262], [200, 262], // mandíbula
    ];
    return (
        <svg className="px-map" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {/* líneas de referencia */}
            <g className="px-ref">
                <line className="px-draw" x1="150" y1="96" x2="150" y2="336" pathLength={1} />
                <line className="px-draw d2" x1="62" y1="168" x2="238" y2="168" pathLength={1} />
                <line className="px-draw d3" x1="76" y1="254" x2="224" y2="254" pathLength={1} />
                <text x="154" y="104">LÍNEA MEDIA</text>
                <text x="64" y="163">BIPUPILAR</text>
                <text x="78" y="249">COMISURAL</text>
            </g>
            {/* malla */}
            <g className="px-mesh">
                <path className="px-draw" pathLength={1} d="M112 168 L150 214 L188 168 M124 254 L150 214 L176 254 M92 196 L112 168 M208 196 L188 168 M92 196 L100 262 L150 318 L200 262 L208 196" />
            </g>
            {/* zona de sonrisa */}
            <g className="px-smile">
                <ellipse cx="150" cy="256" rx="46" ry="24" pathLength={1} />
            </g>
            {/* puntos */}
            <g className="px-pts">
                {pts.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="1.9" style={{ transitionDelay: `${0.07 * i}s`, animationDelay: `${0.6 + 0.27 * i}s` }} />
                ))}
            </g>
        </svg>
    );
}

export function ProcessingStep({ image, processStatus, isDesktop }: ProcessingStepProps) {
    const reduce = useReducedMotion() ?? false;
    const fillRef = useSmoothProgress(processStatus, reduce);
    const imgUrl = fileObjectUrl(image);

    const idx = Math.max(ORDER.indexOf(processStatus), 1); // "idle" ⇒ primera etapa
    const done = processStatus === "complete";
    const stage = STAGES[Math.min(idx, STAGES.length) - 1];

    // Texto tranquilizador si una etapa se alarga (derivado, sin setState síncrono).
    const [slowFor, setSlowFor] = useState<ProcessStatus | null>(null);
    useEffect(() => {
        if (processStatus !== "designing") return;
        const t = setTimeout(() => setSlowFor("designing"), SLOW_AFTER_MS);
        return () => clearTimeout(t);
    }, [processStatus]);
    const slow = slowFor === processStatus;

    const title = done ? DONE_COPY.title : stage.title;
    const desc = done ? DONE_COPY.desc : slow ? SLOW_DESC : stage.desc;
    const step = Math.min(idx, STAGES.length);

    const body = (
        <div className="wf-body px" data-stage={done ? 6 : idx}>
            <div className="px-media">
                <div className="px-stage">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {imgUrl && <img className="px-photo" src={imgUrl} alt="" />}
                    <span className="px-vignette" aria-hidden="true" />
                    <FaceMap />
                    <span className="px-sweep" aria-hidden="true" />
                    <span className="px-flash" aria-hidden="true" />
                    <span className="px-bracket tl" aria-hidden="true" />
                    <span className="px-bracket tr" aria-hidden="true" />
                    <span className="px-bracket bl" aria-hidden="true" />
                    <span className="px-bracket br" aria-hidden="true" />
                    <span className="px-chip">
                        <span className="px-chip-dot" aria-hidden="true" />
                        {done ? "Análisis completado" : "Análisis facial IA"}
                    </span>
                </div>
            </div>

            <div className="px-panel">
                <p className="px-eyebrow">
                    <span>{done ? "Completado" : "En curso"}</span>
                    <span className="px-count" aria-hidden="true">
                        {String(step).padStart(2, "0")}<i>/</i>{String(STAGES.length).padStart(2, "0")}
                    </span>
                </p>

                <div className="px-copy" aria-live="polite" aria-atomic="true">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={title + desc}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <h2 className="px-title">{title}</h2>
                            <p className="px-desc">{desc}</p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div
                    className="px-track"
                    role="progressbar"
                    aria-label="Progreso de la simulación"
                    aria-valuemin={0}
                    aria-valuemax={STAGES.length}
                    aria-valuenow={done ? STAGES.length : step - 1}
                    aria-valuetext={done ? DONE_COPY.title : `Paso ${step} de ${STAGES.length}: ${stage.label}`}
                >
                    <span ref={fillRef} className="px-fill" />
                </div>

                <ol className="px-steps">
                    {STAGES.map((s, i) => {
                        const n = i + 1;
                        const state = done || idx > n ? "done" : idx === n ? "active" : "pending";
                        return (
                            <li key={s.status} className={`px-step ${state}`} aria-current={state === "active" ? "step" : undefined}>
                                <span className="px-ind" aria-hidden="true">
                                    {state === "done" && (
                                        <svg viewBox="0 0 16 16"><path d="M4.2 8.4l2.4 2.4 5.2-5.4" pathLength={1} /></svg>
                                    )}
                                </span>
                                <span className="px-label">{s.label}</span>
                                <span className="sr-only">
                                    {state === "done" ? " (completado)" : state === "active" ? " (en curso)" : ""}
                                </span>
                            </li>
                        );
                    })}
                </ol>

                <p className="px-foot">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
                        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
                    </svg>
                    Procesamiento privado · menos de un minuto
                </p>
            </div>
        </div>
    );

    return isDesktop ? <div className="dk-proc">{body}</div> : body;
}
