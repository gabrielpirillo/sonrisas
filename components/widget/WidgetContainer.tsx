"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { BRAND_NAME } from "@/lib/brand";
import { useWidgetState } from "./useWidgetState";
import { useIsDesktop } from "./useIsDesktop";
import { LoadingOverlay } from "./LoadingOverlay";
import { WIcon, LogoMark } from "./WIcon";
import type { WidgetContainerProps, Step } from "./types";
import { WidgetConfigProvider, useWidgetConfig } from "./WidgetConfigContext";
import { widgetCssVars } from "@/lib/widgetConfig";
import "./widget-qoves.css";

// Step Components
import { LeadFormStep } from "./steps/LeadFormStep";
import { PhotoStep } from "./steps/PhotoStep";
import { ProcessingStep } from "./steps/ProcessingStep";
import { ResultStep } from "./steps/ResultStep";
import { SuccessStep } from "./steps/SuccessStep";

const MOBILE_LABELS = ["Datos", "Foto", "Análisis", "Resultado"];
const DESKTOP_LABELS = ["Datos y foto", "Análisis", "Resultado"];

const MOBILE_IDX: Partial<Record<Step, number>> = {
    LEAD_FORM: 0, PHOTO: 1, PROCESSING: 2, RESULT: 3, LOCKED_RESULT: 3,
};
const DESKTOP_IDX: Partial<Record<Step, number>> = {
    LEAD_FORM: 0, PROCESSING: 1, RESULT: 2, LOCKED_RESULT: 2,
};

const SUCCESS_STEPS: Step[] = ["EMAIL_SENT", "PHOTO_SUCCESS", "CLINICAL_REQUEST_SUCCESS"];

function Stepper({ labels, activeIdx, className }: { labels: string[]; activeIdx: number; className: string }) {
    return (
        <ol className={`stepper ${className}`} aria-label="Progreso" style={{ listStyle: "none", margin: 0 }}>
            {labels.map((lbl, i) => (
                <li
                    key={i}
                    className={"stepper-node" + (i < activeIdx ? " done" : i === activeIdx ? " active" : "")}
                    aria-current={i === activeIdx ? "step" : undefined}
                >
                    <span className="stepper-dot">{i < activeIdx ? <WIcon name="check" size={13} /> : i + 1}</span>
                    <span className="stepper-lbl">{lbl}</span>
                    {i < labels.length - 1 && (
                        <span className="stepper-line" aria-hidden="true"><span className="stepper-fill" /></span>
                    )}
                </li>
            ))}
        </ol>
    );
}

// Transición entre pasos: fundido + leve desplazamiento (MotionConfig
// reducedMotion="user" la reduce a solo opacidad si el sistema lo pide).
const STEP_MOTION = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const } },
};

export default function WidgetContainer(props: WidgetContainerProps) {
    return (
        <WidgetConfigProvider>
            <WidgetInner {...props} />
        </WidgetConfigProvider>
    );
}

function WidgetInner(props: WidgetContainerProps) {
    const { config, clinicName } = useWidgetConfig();
    const state = useWidgetState(props);
    const isDesktop = useIsDesktop();
    const containerRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const isEmbedded = searchParams.get("embed") === "widget";
    const [photoReady, setPhotoReady] = useState(false);

    const {
        step, setStep,
        image, generatedImage, demoBeforeImage, alignedImage,
        processStatus, formValues, setFormValues,
        selectedFile, setSelectedFile, selectedCountry, setSelectedCountry,
        userEmail, isSubmittingPhoto, isSubmittingVideo, loadingMessage,
        handleUpload, handleClinicalVideoRequest, handleSendPhotoEmail, videoWhatsappHref,
    } = state;

    // Send height to parent window for iframe auto-resize
    useEffect(() => {
        if (!isEmbedded || !containerRef.current) return;
        let lastSentHeight = 0;
        const sendHeight = () => {
            const el = containerRef.current;
            if (!el) return;
            const containerTop = el.getBoundingClientRect().top;
            let maxBottom = 0;
            el.querySelectorAll(":scope > *").forEach((child) => {
                const childBottom = child.getBoundingClientRect().bottom - containerTop;
                if (childBottom > maxBottom) maxBottom = childBottom;
            });
            const measured = Math.ceil(maxBottom > 0 ? maxBottom : Math.max(el.scrollHeight, el.offsetHeight));
            const height = measured + 50;
            if (height > 0 && Math.abs(height - lastSentHeight) > 2) {
                lastSentHeight = height;
                // Nombre de evento heredado: lo escuchan los snippets de embed ya instalados.
                window.parent.postMessage({ type: "smileforward-resize", height }, "*");
            }
        };
        const resizeObserver = new ResizeObserver(() => setTimeout(sendHeight, 50));
        resizeObserver.observe(containerRef.current);
        const mutationObserver = new MutationObserver(() => setTimeout(sendHeight, 100));
        mutationObserver.observe(containerRef.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
        let pollCount = 0;
        const pollInterval = setInterval(() => { sendHeight(); if (++pollCount >= 50) clearInterval(pollInterval); }, 300);
        sendHeight();
        [300, 600, 1000].forEach((d) => setTimeout(sendHeight, d));
        const handleResize = () => setTimeout(sendHeight, 100);
        window.addEventListener("resize", handleResize);
        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            clearInterval(pollInterval);
            window.removeEventListener("resize", handleResize);
        };
    }, [isEmbedded, step]);

    // Al cambiar de paso, si el inicio del widget quedó por encima de la
    // pantalla (p. ej. tras "Continuar" al final de un formulario largo),
    // volver arriba para que el nuevo paso se vea desde su título.
    const prevStep = useRef(step);
    useEffect(() => {
        if (prevStep.current === step) return;
        prevStep.current = step;
        const el = containerRef.current;
        if (!el || isEmbedded) return;
        if (el.getBoundingClientRect().top < 0) {
            const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
        }
    }, [step, isEmbedded]);

    const isSuccess = SUCCESS_STEPS.includes(step);
    const mobileIdx = MOBILE_IDX[step] ?? 0;
    const desktopIdx = DESKTOP_IDX[step] ?? 0;

    // ── Back navigation (per step) ──
    // Una vez generada la imagen (RESULT) no se permite volver atrás para
    // generar otra: solo el paso de Foto puede regresar a Datos.
    const goBack = () => {
        if (step === "PHOTO") setStep("LEAD_FORM");
    };
    const showBack = !isSuccess && step === "PHOTO";

    const restart = () => {
        setSelectedFile(null);
        setPhotoReady(false);
        setStep("LEAD_FORM");
    };

    // RESULT y LOCKED_RESULT comparten vista: misma clave para no re-animar.
    const stageKey = step === "LOCKED_RESULT" ? "RESULT" : step;

    return (
        <MotionConfig reducedMotion="user">
        <div
            ref={containerRef}
            data-embed={isEmbedded ? "true" : undefined}
            // overflow-clip (no hidden): recorta las esquinas sin crear un contenedor
            // de scroll, así la barra del CTA puede quedar fija (sticky) abajo.
            className={`qoves-widget relative w-full flex flex-col ${isEmbedded ? "overflow-visible" : "sm:rounded-[2rem] overflow-clip"}`}
            style={widgetCssVars(config) as React.CSSProperties}
        >
            <LoadingOverlay visible={isSubmittingPhoto || isSubmittingVideo} message={loadingMessage} />

            {/* Header */}
            <header className="wf-header">
                <div className="wf-header-left">
                    <AnimatePresence mode="wait" initial={false}>
                        {showBack ? (
                            <motion.button
                                key="back"
                                type="button"
                                className="wf-back"
                                onClick={goBack}
                                aria-label="Atrás"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                <WIcon name="back" size={17} />
                            </motion.button>
                        ) : (
                            <motion.span
                                key="logo"
                                style={{ display: "inline-flex" }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                {config.brand.logoUrl ? null : <LogoMark size={isDesktop ? 32 : 30} />}
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <span className="wf-brand">
                        {config.brand.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={config.brand.logoUrl} alt={config.brand.displayName || clinicName || "Logo de la clínica"} className="wf-brand-logo" />
                        ) : config.brand.displayName ? (
                            <span className="wf-brand-name">{config.brand.displayName}</span>
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src="/brand/smilefast-black.png" alt={BRAND_NAME} />
                        )}
                    </span>
                </div>

                {/* Desktop stepper sits inside the header */}
                {!isSuccess && <Stepper labels={DESKTOP_LABELS} activeIdx={desktopIdx} className="stepper-desktop" />}

                {config.brand.showOnline ? <span className="wf-online"><span className="wf-online-dot" />EN LÍNEA</span> : <span />}
            </header>

            {/* Mobile stepper row */}
            {!isSuccess && <Stepper labels={MOBILE_LABELS} activeIdx={mobileIdx} className="stepper-mobile" />}

            {/* Steps */}
            <AnimatePresence mode="wait" initial={false}>
            <motion.div key={stageKey} className="wf-stage" {...STEP_MOTION}>
            {step === "LEAD_FORM" && (
                <LeadFormStep
                    isDesktop={isDesktop}
                    formValues={formValues}
                    setFormValues={setFormValues}
                    selectedCountry={selectedCountry}
                    setSelectedCountry={setSelectedCountry}
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    photoReady={photoReady}
                    setPhotoReady={setPhotoReady}
                    onContinue={() => setStep("PHOTO")}
                    onSubmit={() => selectedFile && handleUpload(selectedFile)}
                />
            )}

            {step === "PHOTO" && (
                <PhotoStep
                    selectedFile={selectedFile}
                    setSelectedFile={setSelectedFile}
                    onUse={() => selectedFile && handleUpload(selectedFile)}
                />
            )}

            {step === "PROCESSING" && (
                <ProcessingStep image={image} processStatus={processStatus} isDesktop={isDesktop} />
            )}

            {(step === "RESULT" || step === "LOCKED_RESULT") && (
                <ResultStep
                    image={image}
                    demoBeforeImage={demoBeforeImage}
                    generatedImage={generatedImage}
                    alignedImage={alignedImage}
                    isSubmittingVideo={isSubmittingVideo}
                    isSubmittingPhoto={isSubmittingPhoto}
                    isDesktop={isDesktop}
                    onClinicalVideoRequest={handleClinicalVideoRequest}
                    onSendPhotoEmail={handleSendPhotoEmail}
                />
            )}

            {step === "EMAIL_SENT" && <SuccessStep variant="email_sent" userEmail={userEmail} onReset={restart} />}
            {step === "PHOTO_SUCCESS" && <SuccessStep variant="photo" userEmail={userEmail} onReset={restart} />}
            {step === "CLINICAL_REQUEST_SUCCESS" && <SuccessStep variant="clinical" userEmail={userEmail} onReset={restart} whatsappHref={videoWhatsappHref} />}
            </motion.div>
            </AnimatePresence>
        </div>
        </MotionConfig>
    );
}
