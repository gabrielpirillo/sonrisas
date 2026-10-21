"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ProcessStatus } from "../types";
import { fileObjectUrl } from "../objectUrl";
import { detectImageLandmarks, type ImageLandmarks } from "@/lib/mediapipe/detectImageLandmarks";
import "./processing-step.css";

interface ProcessingStepProps {
    /** Foto del paciente: File (flujo normal) o URL (blob:, data: o remota). */
    image: File | string | null;
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

// ---------------------------------------------------------------------------
// Mapeo facial sobre el rostro REAL
// ---------------------------------------------------------------------------

/** Tiempo máximo antes de pasar al escaneo neutro (sin geometría). */
const DETECT_BUDGET_MS = 1500;
/** Pasado este tiempo, un resultado tardío ya no se dibuja (evita apariciones al final). */
const DETECT_MAX_MS = 6000;

/** Índices de la malla de MediaPipe FaceLandmarker (478 puntos con iris). */
const LM = {
    irisA: 468, irisB: 473, // centros de iris (pupilas)
    eyeA: [33, 133], eyeB: [263, 362], // comisuras de cada ojo (respaldo sin iris)
    forehead: 10, nasion: 168, nose: 1,
    lipTopOuter: 0, lipBottomOuter: 17, lipTop: 13, lipBottom: 14,
    mouthA: 61, mouthB: 291,
    chin: 152, cheekA: 234, cheekB: 454, jawA: 172, jawB: 397,
} as const;

type P = { x: number; y: number };
type FaceStatus = "pending" | "ready" | "none";

const mid = (a: P, b: P): P => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: P, b: P) => Math.hypot(b.x - a.x, b.y - a.y);
const unit = (a: P, b: P): P => {
    const d = dist(a, b) || 1;
    return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
};
const along = (p: P, u: P, k: number): P => ({ x: p.x + u.x * k, y: p.y + u.y * k });
const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${r1(p.x)} ${r1(p.y)}`;

/** Recorta el segmento a–b al rectángulo [m, w−m]×[m, h−m] (Liang–Barsky). */
function clipSegment(a: P, b: P, w: number, h: number, m: number): [P, P] | null {
    let t0 = 0, t1 = 1;
    const dx = b.x - a.x, dy = b.y - a.y;
    const edges: [number, number][] = [[-dx, a.x - m], [dx, w - m - a.x], [-dy, a.y - m], [dy, h - m - a.y]];
    for (const [p, q] of edges) {
        if (p === 0) { if (q < 0) return null; continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
        else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [{ x: a.x + t0 * dx, y: a.y + t0 * dy }, { x: a.x + t1 * dx, y: a.y + t1 * dy }];
}

interface FaceGeometry {
    midline: string; // path d
    midLabel: P;
    bipupilar: [P, P] | null;
    comisural: [P, P] | null;
    mesh: string;
    smile: { cx: number; cy: number; rx: number; ry: number; deg: number };
    dots: P[];
}

/**
 * Proyecta los landmarks normalizados al sistema de coordenadas del
 * escenario (px), replicando el `object-fit: cover` centrado de la foto.
 */
function buildGeometry(face: ImageLandmarks, W: number, H: number): FaceGeometry | null {
    const { width: nw, height: nh, landmarks: lm } = face;
    if (lm.length < 468 || W < 10 || H < 10) return null;
    const s = Math.max(W / nw, H / nh);
    const ox = (W - nw * s) / 2;
    const oy = (H - nh * s) / 2;
    const at = (i: number): P => ({ x: lm[i].x * nw * s + ox, y: lm[i].y * nh * s + oy });
    const hasIris = lm.length >= 478;

    const pupilA = hasIris ? at(LM.irisA) : mid(at(LM.eyeA[0]), at(LM.eyeA[1]));
    const pupilB = hasIris ? at(LM.irisB) : mid(at(LM.eyeB[0]), at(LM.eyeB[1]));
    const forehead = at(LM.forehead), nasion = at(LM.nasion), nose = at(LM.nose);
    const lipTopO = at(LM.lipTopOuter), lipBotO = at(LM.lipBottomOuter);
    const lipTop = at(LM.lipTop), lipBot = at(LM.lipBottom);
    const mouthA = at(LM.mouthA), mouthB = at(LM.mouthB);
    const chin = at(LM.chin);
    const cheekA = at(LM.cheekA), cheekB = at(LM.cheekB);
    const jawA = at(LM.jawA), jawB = at(LM.jawB);

    const fw = dist(cheekA, cheekB);
    if (fw < 12) return null;

    // Línea media: por los puntos reales (frente → nasion → nariz → labios → mentón),
    // prolongada en los extremos siguiendo su propia dirección.
    const top = along(forehead, unit(nasion, forehead), fw * 0.2);
    const bottom = along(chin, unit(lipBotO, chin), fw * 0.12);
    const clampY = (p: P): P => ({ x: p.x, y: Math.min(Math.max(p.y, 8), H - 8) });
    const midPts = [clampY(top), forehead, nasion, nose, lipTopO, lipBotO, chin, clampY(bottom)];
    const midline = "M" + midPts.map(pt).join(" L");

    // Bipupilar y comisural: rectas por los puntos reales, prolongadas y recortadas al visor.
    const ext = (a: P, b: P, k: number) => {
        const u = unit(a, b);
        return clipSegment(along(a, u, -k), along(b, u, k), W, H, 10);
    };
    const bipupilar = ext(pupilA, pupilB, fw * 0.4);
    const comisural = ext(mouthA, mouthB, fw * 0.38);

    const mesh = [
        `M${pt(pupilA)} L${pt(nose)} L${pt(pupilB)}`,
        `M${pt(mouthA)} L${pt(nose)} L${pt(mouthB)}`,
        `M${pt(cheekA)} L${pt(pupilA)}`,
        `M${pt(cheekB)} L${pt(pupilB)}`,
        `M${pt(cheekA)} L${pt(jawA)} L${pt(chin)} L${pt(jawB)} L${pt(cheekB)}`,
    ].join(" ");

    // Zona de sonrisa: elipse alrededor de la boca, orientada con las comisuras.
    const mouthW = dist(mouthA, mouthB);
    const mouthH = dist(lipTopO, lipBotO);
    const c = mid(mid(mouthA, mouthB), mid(lipTopO, lipBotO));
    const rx = mouthW / 2 * 1.3 + 6;
    const ry = Math.max(mouthH / 2 * 1.4, rx * 0.4) + 4;
    const deg = (Math.atan2(mouthB.y - mouthA.y, mouthB.x - mouthA.x) * 180) / Math.PI;

    return {
        midline,
        midLabel: { x: midPts[0].x + 5, y: midPts[0].y + 9 },
        bipupilar,
        comisural,
        mesh,
        smile: { cx: r1(c.x), cy: r1(c.y), rx: r1(rx), ry: r1(ry), deg: r1(deg) },
        dots: [forehead, pupilA, pupilB, cheekA, cheekB, nose, mouthA, mouthB, lipTop, lipBot, jawA, jawB, chin],
    };
}

/**
 * Detecta el rostro de la foto mostrada; no bloquea el flujo de procesado.
 * Arranca cuando termina la validación (`enabled`): la validación ya usa el
 * mismo detector, así que aquí corre "en caliente" y sin competir con ella
 * por el hilo principal.
 */
function useFaceLandmarks(url: string | null, enabled: boolean): { status: FaceStatus; face: ImageLandmarks | null } {
    const [found, setFound] = useState<{ url: string; face: ImageLandmarks | null } | null>(null);
    const [lateFor, setLateFor] = useState<string | null>(null);

    useEffect(() => {
        if (!url || !enabled) return;
        let alive = true;
        const t0 = performance.now();
        const late = setTimeout(() => { if (alive) setLateFor(url); }, DETECT_BUDGET_MS);
        detectImageLandmarks(url)
            .then((face) => {
                if (!alive) return;
                // Muy tarde: nos quedamos con el escaneo neutro.
                setFound({ url, face: performance.now() - t0 <= DETECT_MAX_MS ? face : null });
            })
            .catch(() => { if (alive) setFound({ url, face: null }); });
        return () => { alive = false; clearTimeout(late); };
    }, [url, enabled]);

    const settled = found && found.url === url ? found : null;
    if (settled?.face) return { status: "ready", face: settled.face };
    if (settled || lateFor === url || !url) return { status: "none", face: null };
    return { status: "pending", face: null };
}

/** Tamaño del escenario (px), recalculado al redimensionar. */
function useBoxSize() {
    const [el, setEl] = useState<HTMLDivElement | null>(null);
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);
    useEffect(() => {
        if (!el || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSize((prev) =>
                prev && Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5 ? prev : { w: width, h: height },
            );
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [el]);
    return [setEl, size] as const;
}

/**
 * Capa de mapeo facial, en píxeles del escenario y anclada a los landmarks
 * reales de la foto. Sin rostro detectado no se dibuja nada (solo queda el
 * barrido neutro): nunca mostramos puntos "aproximados".
 * Los elementos aparecen según la etapa (data-stage en el contenedor).
 */
function FaceMap({ geo, w, h }: { geo: FaceGeometry; w: number; h: number }) {
    const { bipupilar, comisural, smile } = geo;
    const angle = (a: P, b: P) => r1((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);
    return (
        <svg className="px-map" width={w} height={h} viewBox={`0 0 ${r1(w)} ${r1(h)}`} aria-hidden="true">
            {/* líneas de referencia */}
            <g className="px-ref">
                <path className="px-draw" d={geo.midline} pathLength={1} />
                {bipupilar && <line className="px-draw d2" x1={r1(bipupilar[0].x)} y1={r1(bipupilar[0].y)} x2={r1(bipupilar[1].x)} y2={r1(bipupilar[1].y)} pathLength={1} />}
                {comisural && <line className="px-draw d3" x1={r1(comisural[0].x)} y1={r1(comisural[0].y)} x2={r1(comisural[1].x)} y2={r1(comisural[1].y)} pathLength={1} />}
                <text x={r1(geo.midLabel.x)} y={r1(geo.midLabel.y)}>LÍNEA MEDIA</text>
                {bipupilar && (
                    <text x={r1(bipupilar[0].x + 2)} y={r1(bipupilar[0].y - 6)} transform={`rotate(${angle(bipupilar[0], bipupilar[1])} ${r1(bipupilar[0].x)} ${r1(bipupilar[0].y)})`}>BIPUPILAR</text>
                )}
                {comisural && (
                    <text x={r1(comisural[0].x + 2)} y={r1(comisural[0].y - 6)} transform={`rotate(${angle(comisural[0], comisural[1])} ${r1(comisural[0].x)} ${r1(comisural[0].y)})`}>COMISURAL</text>
                )}
            </g>
            {/* malla */}
            <g className="px-mesh">
                <path className="px-draw" pathLength={1} d={geo.mesh} />
            </g>
            {/* zona de sonrisa */}
            <g className="px-smile">
                <ellipse cx={smile.cx} cy={smile.cy} rx={smile.rx} ry={smile.ry} transform={`rotate(${smile.deg} ${smile.cx} ${smile.cy})`} pathLength={1} />
            </g>
            {/* puntos */}
            <g className="px-pts">
                {geo.dots.map((p, i) => (
                    <circle key={i} cx={r1(p.x)} cy={r1(p.y)} r="2.2" style={{ transitionDelay: `${0.07 * i}s`, animationDelay: `${0.6 + 0.27 * i}s` }} />
                ))}
            </g>
        </svg>
    );
}

export function ProcessingStep({ image, processStatus, isDesktop }: ProcessingStepProps) {
    const reduce = useReducedMotion() ?? false;
    const fillRef = useSmoothProgress(processStatus, reduce);
    const imgUrl = typeof image === "string" ? image || null : fileObjectUrl(image);
    const { status: faceStatus, face } = useFaceLandmarks(imgUrl, processStatus !== "idle" && processStatus !== "validating");
    const [stageRef, stageSize] = useBoxSize();
    const geo = useMemo(
        () => (face && stageSize ? buildGeometry(face, stageSize.w, stageSize.h) : null),
        [face, stageSize],
    );

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
        <div className="wf-body px" data-stage={done ? 6 : idx} data-face={geo ? "ready" : faceStatus === "ready" ? "pending" : faceStatus}>
            <div className="px-media">
                <div className="px-stage" ref={stageRef}>
                    {/* foto + mapeo en un mismo marco: "respiran" juntos y los puntos no se desalinean */}
                    <div className="px-frame">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {imgUrl && <img className="px-photo" src={imgUrl} alt="" />}
                        <span className="px-vignette" aria-hidden="true" />
                        {geo && stageSize && <FaceMap geo={geo} w={stageSize.w} h={stageSize.h} />}
                    </div>
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
