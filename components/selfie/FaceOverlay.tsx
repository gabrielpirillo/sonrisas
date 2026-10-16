"use client";

import { motion } from "framer-motion";

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
    // Paleta de marca: neutro (sin cara) · ámbar (ajuste) · rosado (error) · cian (listo)
    const NEUTRAL = "rgba(255, 255, 255, 0.75)";
    const WARN = "#f2c879";
    const ERR = "#e8a59c";
    const OK = "#06b6d4";

    // Determine stroke color and feedback text based on detailed state
    let strokeColor = NEUTRAL;
    let feedbackText = "Ubica tu cara en el óvalo";
    let strokeWidth = 2; // Thinner by default

    if (multipleFacesDetected) {
        strokeColor = ERR;
        feedbackText = "Solo una persona";
    } else if (!faceDetected) {
        strokeColor = NEUTRAL;
        feedbackText = "Ubica tu cara en el óvalo";
    } else if (faceDetected && !isAligned) {
        // Face detected but something is off (centering, size, or smile, or light)

        if (isLowLight) {
            strokeColor = WARN;
            feedbackText = "Necesitas más luz";
        } else if (!isSmiling) {
            // Check specific reasons for not smiling
            if (smileScore > 0.25 && jawOpenScore <= 0.01) {
                strokeColor = WARN;
                feedbackText = "Abre un poco más la boca";
            } else {
                strokeColor = WARN;
                feedbackText = "¡Sonríe!";
            }
        } else {
            // Smiling but not aligned (position/size)
            strokeColor = ERR;
            if (!isCentered) {
                feedbackText = "Centra tu cara";
            } else if (!isCorrectSize) {
                feedbackText = "Acércate un poco más";
            } else {
                feedbackText = "Ajusta tu posición";
            }
        }
    } else if (isAligned) {
        strokeColor = OK;
        strokeWidth = 4;
        feedbackText = "¡Perfecto!";
    }

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center font-sans">
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full opacity-60"
                preserveAspectRatio="none"
            >
                <defs>
                    <mask id="mask" x="0" y="0" width="100%" height="100%">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <motion.ellipse
                            cx="50"
                            cy="45"
                            rx="20"
                            ry="28"
                            fill="black"
                            animate={{
                                rx: isAligned ? 21 : 20,
                                ry: isAligned ? 29 : 28,
                            }}
                            transition={{
                                duration: 0.5,
                                repeat: isAligned ? 0 : Infinity,
                                repeatType: "reverse",
                            }}
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(19,27,34,0.72)"
                    mask="url(#mask)"
                />

                <motion.ellipse
                    cx="50"
                    cy="45"
                    rx="20"
                    ry="28"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isAligned ? "0" : "1 4"}
                    animate={{
                        scale: isAligned ? 1.02 : 1,
                        stroke: strokeColor,
                    }}
                    transition={{ duration: 0.3 }}
                />
            </svg>

            <div className="absolute top-1/2 mt-16 w-full flex justify-center px-4">
                <motion.p
                    key={feedbackText}
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-medium tracking-[-0.01em] text-white backdrop-blur-md"
                    style={{
                        background: isAligned ? "rgba(6,182,212,0.28)" : "rgba(19,27,34,0.55)",
                        border: `1px solid ${isAligned ? "rgba(6,182,212,0.7)" : "rgba(255,255,255,0.22)"}`,
                        boxShadow: isAligned ? "0 0 24px rgba(6,182,212,0.45)" : "none",
                    }}
                >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: strokeColor, boxShadow: `0 0 8px ${strokeColor}` }} />
                    {feedbackText}
                </motion.p>
            </div>
        </div>
    );
};
