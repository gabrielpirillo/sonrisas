"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useWidgetState } from "./useWidgetState";
import { useIsDesktop } from "./useIsDesktop";
import { LoadingOverlay } from "./LoadingOverlay";
import { WIcon, LogoMark } from "./WIcon";
import type { WidgetContainerProps, Step } from "./types";
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
        <div className={`stepper ${className}`}>
            {labels.map((lbl, i) => (
                <div key={i} className={"stepper-node" + (i < activeIdx ? " done" : i === activeIdx ? " active" : "")}>
                    <span className="stepper-dot">{i < activeIdx ? <WIcon name="check" size={12} /> : i + 1}</span>
                    <span className="stepper-lbl">{lbl}</span>
                    {i < labels.length - 1 && <span className="stepper-line" />}
                </div>
            ))}
        </div>
    );
}

export default function WidgetContainer(props: WidgetContainerProps) {
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
        handleUpload, handleClinicalVideoRequest, handleSendPhotoEmail,
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

    return (
        <div
            ref={containerRef}
            data-embed={isEmbedded ? "true" : undefined}
            className={`qoves-widget relative w-full flex flex-col ${isEmbedded ? "overflow-visible" : "min-h-[100dvh] rounded-[2rem] border border-zinc-200 overflow-hidden"}`}
        >
            <LoadingOverlay visible={isSubmittingPhoto || isSubmittingVideo} message={loadingMessage} />

            {/* Header */}
            <header className="wf-header">
                <div className="wf-header-left">
                    {showBack ? (
                        <button type="button" className="wf-back" onClick={goBack} aria-label="Atrás"><WIcon name="back" size={17} /></button>
                    ) : (
                        <LogoMark size={isDesktop ? 32 : 28} />
                    )}
                    <span className="wf-brand">Smile Forward</span>
                </div>

                {/* Desktop stepper sits inside the header */}
                {!isSuccess && <Stepper labels={DESKTOP_LABELS} activeIdx={desktopIdx} className="stepper-desktop" />}

                <span className="wf-online"><span className="wf-online-dot" />ONLINE</span>
            </header>

            {/* Mobile stepper row */}
            {!isSuccess && <Stepper labels={MOBILE_LABELS} activeIdx={mobileIdx} className="stepper-mobile" />}

            {/* Steps */}
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
            {step === "CLINICAL_REQUEST_SUCCESS" && <SuccessStep variant="clinical" userEmail={userEmail} onReset={restart} />}
        </div>
    );
}
