"use client";

import { motion, useReducedMotion } from "framer-motion";

interface FaceOverlayProps {
    isAligned: boolean;
    isSmiling: boolean;
    faceDetected: boolean;
    multipleFacesDetected: boolean;
    isLowLight: boolean;
    smileScore: number;
    jawOpenScore: number;
    isCentered: boolean;
    isCorrectSize: boolean;
}

/**
 * Guía de encuadre sobre la cámara: óvalo con proporción de cara (no se
 * deforma en contenedores altos o bajos) + indicación arriba. Usa unidades de
 * contenedor (cqh/cqw) para encajar tanto en el panel del widget como en la
 * página /selfie a pantalla completa.
 */
export const FaceOverlay: React.FC<FaceOverlayProps> = ({
    isAligned,
    isSmiling,
    faceDetected,
    multipleFacesDetected,
    isLowLight,
    smileScore,
    jawOpenScore,
    isCentered,
    isCorrectSize,
}) => {
    const reduceMotion = useReducedMotion();
    // Paleta: neutro (sin cara) · ámbar (ajuste) · rosado (error) · luz de escaneo
    // de la marca (listo). --scan sigue al acento del widget; fuera del widget es cian.
    const NEUTRAL = "rgba(255, 255, 255, 0.8)";
    const WARN = "#f2c879";
    const ERR = "#e8a59c";
    const OK = "var(--scan, #06b6d4)";
    const okA = (pct: number) => `color-mix(in srgb, ${OK} ${pct}%, transparent)`;
    const SHADE = "var(--w-shade-deep, #131b22)";

    let strokeColor = NEUTRAL;
    let feedbackText = "Ubica tu cara en el óvalo";

    if (multipleFacesDetected) {
        strokeColor = ERR;
        feedbackText = "Solo una persona";
    } else if (!faceDetected) {
        strokeColor = NEUTRAL;
        feedbackText = "Ubica tu cara en el óvalo";
    } else if (!isAligned) {
        if (isLowLight) {
            strokeColor = WARN;
            feedbackText = "Necesitas más luz";
        } else if (!isSmiling) {
            strokeColor = WARN;
            feedbackText = smileScore > 0.25 && jawOpenScore <= 0.01 ? "Abre un poco más la boca" : "¡Sonríe!";
        } else {
            strokeColor = ERR;
            feedbackText = !isCentered ? "Centra tu cara" : !isCorrectSize ? "Acércate un poco más" : "Ajusta tu posición";
        }
    } else {
        strokeColor = OK;
        feedbackText = "¡Perfecto!";
    }

    return (
        <div
            className="absolute inset-0 pointer-events-none overflow-hidden font-sans"
            style={{ containerType: "size" }}
        >
            {/* Óvalo: el resto de la imagen queda atenuado con una sombra enorme */}
            <motion.div
                aria-hidden="true"
                className="absolute left-1/2 rounded-[50%]"
                style={{
                    top: "46%",
                    x: "-50%",
                    y: "-50%",
                    height: "min(54cqh, 76cqw)",
                    aspectRatio: "3 / 4",
                    border: `${isAligned ? 3 : 2}px ${isAligned ? "solid" : "dashed"} ${strokeColor}`,
                    boxShadow: `0 0 0 100vmax color-mix(in srgb, ${SHADE} 60%, transparent)${isAligned ? `, 0 0 28px ${OK}, inset 0 0 22px ${okA(35)}` : ""}`,
                    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                }}
                animate={reduceMotion ? { scale: 1 } : { scale: isAligned ? 1.02 : [1, 1.025, 1] }}
                transition={
                    reduceMotion || isAligned
                        ? { duration: 0.3 }
                        : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                }
            />

            {/* Indicación (arriba, lejos de la boca y del disparador) */}
            <div className="absolute top-3.5 inset-x-3.5 flex justify-center" aria-live="polite">
                <motion.p
                    key={feedbackText}
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="m-0 inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-medium leading-tight tracking-[-0.01em] text-white backdrop-blur-md"
                    style={{
                        background: isAligned ? okA(30) : `color-mix(in srgb, ${SHADE} 62%, transparent)`,
                        border: `1px solid ${isAligned ? okA(70) : "rgba(255,255,255,0.22)"}`,
                        boxShadow: isAligned ? `0 0 24px ${okA(45)}` : "none",
                    }}
                >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: strokeColor, boxShadow: `0 0 8px ${strokeColor}` }} />
                    {feedbackText}
                </motion.p>
            </div>
        </div>
    );
};
