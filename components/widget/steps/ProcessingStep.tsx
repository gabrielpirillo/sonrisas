"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProcessStatus } from "../types";

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

function FaceLandmarks() {
    return (
        <svg className="proc-landmarks" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice">
            <ellipse cx="100" cy="116" rx="60" ry="78" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="1" />
            <g stroke="rgba(255,255,255,0.7)" strokeWidth="0.7">
                <line x1="100" y1="40" x2="100" y2="200" strokeDasharray="2 4" opacity="0.5" />
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

    const imgUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
    useEffect(() => () => { if (imgUrl) URL.revokeObjectURL(imgUrl); }, [imgUrl]);

    const pct = PROGRESS[processStatus] ?? 8;

    const body = (
        <div className="wf-body proc-a">
            <div className="proc-a-stage">
                {imgUrl && <img src={imgUrl} alt="Analizando" />}
                <FaceLandmarks />
                <div className="proc-scanline" />
                <span className="proc-tag" style={{ top: "26%", left: "12%" }}>VITA A2</span>
                <span className="proc-tag" style={{ top: "44%", right: "10%" }}>0.31</span>
                <span className="proc-tag" style={{ top: "62%", left: "16%" }}>SIM 0.56</span>
                <div className="proc-a-bar">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                        <span className="mono" style={{ fontSize: 9, color: "#fff" }}>DISEÑO GENERATIVO</span>
                        <span className="mono" style={{ fontSize: 9, color: "#fff" }}>{pct}%</span>
                    </div>
                    <div className="proc-track"><div style={{ width: pct + "%" }} /></div>
                </div>
            </div>
            <p className="proc-phrase" key={phrase}>{PHRASES[phrase]}</p>
        </div>
    );

    return isDesktop ? <div className="dk-proc">{body}</div> : body;
}
