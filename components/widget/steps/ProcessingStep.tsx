"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { StatusItem } from "../StatusItem";
import type { ProcessStatus } from "../types";
import { fileObjectUrl } from "../objectUrl";

interface ProcessingStepProps {
    image: File | null;
    processStatus: ProcessStatus;
    isDesktop: boolean;
}

const PHRASES = [
    "Analizando tu morfología dental…",
    "Calculando proporciones y simetría…",
    "Diseñando tu sonrisa ideal…",
    "Renderizando tu simulación…",
];

// Map the real pipeline status → a progress percentage.
const PROGRESS: Record<ProcessStatus, number> = {
    idle: 8,
    validating: 18,
    scanning: 36,
    analyzing: 56,
    designing: 78,
    aligning: 92,
    complete: 99,
};

// Orden real del pipeline (useWidgetState) → chips de estado.
const ORDER: ProcessStatus[] = ["idle", "validating", "scanning", "analyzing", "designing", "aligning", "complete"];
const STAGES: { status: ProcessStatus; label: string }[] = [
    { status: "validating", label: "Validación" },
    { status: "scanning", label: "Escaneo" },
    { status: "analyzing", label: "Análisis" },
    { status: "designing", label: "Diseño" },
];

function FaceLandmarks() {
    return (
        <svg className="proc-landmarks" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <ellipse className="lm-oval" cx="100" cy="116" rx="60" ry="78" fill="none" stroke="rgba(185,207,221,0.6)" strokeWidth="0.9" />
            <line x1="100" y1="34" x2="100" y2="200" stroke="rgba(6,182,212,0.55)" strokeWidth="0.6" strokeDasharray="2 4" />
            <line x1="62" y1="152" x2="138" y2="152" stroke="rgba(6,182,212,0.4)" strokeWidth="0.6" strokeDasharray="2 4" />
            <g fill="#06b6d4">
                <circle className="lm-pt" cx="78" cy="100" r="2.2" />
                <circle className="lm-pt" cx="122" cy="100" r="2.2" />
                <circle className="lm-pt" cx="100" cy="128" r="2.2" />
                <circle className="lm-pt" cx="80" cy="152" r="2.2" />
                <circle className="lm-pt" cx="120" cy="152" r="2.2" />
            </g>
        </svg>
    );
}

export function ProcessingStep({ image, processStatus, isDesktop }: ProcessingStepProps) {
    const [phrase, setPhrase] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 2400);
        return () => clearInterval(t);
    }, []);

    const imgUrl = fileObjectUrl(image);

    const pct = PROGRESS[processStatus] ?? 8;
    const cur = Math.max(ORDER.indexOf(processStatus), 1); // "idle" ⇒ primera etapa activa

    const body = (
        <div className="wf-body proc-a">
            <div className="proc-a-stage" role="img" aria-label="Analizando tu foto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imgUrl && <img src={imgUrl} alt="" />}
                <span className="proc-tint" />
                <span className="proc-grid" />
                <FaceLandmarks />
                <div className="proc-scanline" />
                <span className="proc-corner tl" /><span className="proc-corner tr" />
                <span className="proc-tag" style={{ top: "24%", left: "9%" }}>SIMETRÍA</span>
                <span className="proc-tag" style={{ top: "43%", right: "8%", animationDelay: "0.2s, 1.2s" }}>LÍNEA MEDIA</span>
                <span className="proc-tag" style={{ top: "61%", left: "12%", animationDelay: "0.4s, 1.8s" }}>TONO</span>
                <div className="proc-a-bar">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span className="mono">DISEÑO GENERATIVO</span>
                        <span className="mono proc-pct">{pct}%</span>
                    </div>
                    <div
                        className="proc-track"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                    >
                        <div style={{ width: pct + "%" }} />
                    </div>
                </div>
            </div>
            <div className="proc-status">
                {STAGES.map((s) => {
                    const idx = ORDER.indexOf(s.status);
                    return <StatusItem key={s.status} label={s.label} completed={cur > idx} active={cur === idx} />;
                })}
            </div>
            <div className="proc-phrase" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                        key={phrase}
                        style={{ margin: 0 }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {PHRASES[phrase]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );

    return isDesktop ? <div className="dk-proc">{body}</div> : body;
}
