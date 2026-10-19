"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { WIcon } from "../WIcon";
import { BeforeAfterSlider } from "../BeforeAfterSlider";
import { fileObjectUrl } from "../objectUrl";
import { useWidgetConfig } from "../WidgetConfigContext";
import { AccentTitle } from "../AccentTitle";

interface ResultStepProps {
    image: File | null;
    demoBeforeImage: string | null;
    generatedImage: string | null;
    alignedImage: string | null;
    isSubmittingVideo: boolean;
    isSubmittingPhoto: boolean;
    isDesktop: boolean;
    onClinicalVideoRequest: () => void;
    onSendPhotoEmail: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function ResultStep({
    image,
    demoBeforeImage,
    generatedImage,
    alignedImage,
    isSubmittingVideo,
    isSubmittingPhoto,
    isDesktop,
    onClinicalVideoRequest,
    onSendPhotoEmail,
}: ResultStepProps) {
    const { config: { texts, features } } = useWidgetConfig();
    const fileUrl = fileObjectUrl(image);

    const beforeSrc = fileUrl || demoBeforeImage || "";
    const afterSrc = alignedImage || generatedImage || "";
    const ready = (image || demoBeforeImage) && generatedImage;
    const busy = isSubmittingVideo || isSubmittingPhoto;

    const slider = (
        <motion.div
            className="wf-result-frame"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
        >
            {ready ? (
                <BeforeAfterSlider beforeImage={beforeSrc} afterImage={afterSrc} fill variant="qoves" className="w-full h-full" />
            ) : (
                <div className="wf-skel">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--blue-light)" }} />
                </div>
            )}
        </motion.div>
    );

    const actions = (
        <>
            {features.videoCta && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onClinicalVideoRequest}>
                {isSubmittingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <WIcon name="wa" size={17} />}
                {isSubmittingVideo ? "Abriendo WhatsApp…" : "Pedir mi vídeo por WhatsApp"}
            </button>
            )}
            {features.photoEmail && (
            <button type="button" className={`btn ${features.videoCta ? "btn-ghost" : "btn-primary"}`} disabled={busy} onClick={onSendPhotoEmail}>
                {isSubmittingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <WIcon name="mail" size={16} />}
                {isSubmittingPhoto ? "Enviando…" : "Recibir mi foto por correo"}
            </button>
            )}
        </>
    );

    // ── Desktop: before/after (izq) + texto/CTAs (der) ──
    if (isDesktop) {
        return (
            <div className="dk-result">
                <div className="dk-result-media">{slider}</div>
                <div className="dk-result-info wf-stagger">
                    <span className="mono mono-pill" style={{ fontSize: 9, alignSelf: "flex-start" }}>
                        <span className="pill-dot" />RESULTADO · SIMULACIÓN
                    </span>
                    <h2 className="wf-h2" style={{ marginTop: 18 }}>
                        <AccentTitle text={texts.resultTitle} />
                    </h2>
                    <p className="wf-sub" style={{ fontSize: 16, margin: "12px 0 6px" }}>{texts.resultSubtitle}</p>
                    {features.videoCta && (
                    <p className="wf-note">
                        ¿Quieres verte en movimiento? Escríbenos por WhatsApp: preparamos tu vídeo en consulta y confirmamos la viabilidad de tu caso con el equipo clínico.
                    </p>
                    )}
                    <div className="dk-result-actions">{actions}</div>
                    <p className="mono" style={{ fontSize: 9, marginTop: 22 }}>SIMULACIÓN ORIENTATIVA · SEGÚN TU CASO CLÍNICO</p>
                </div>
            </div>
        );
    }

    // ── Mobile ──
    return (
        <div className="wf-body">
            <div className="wf-intro wf-stagger">
                <div style={{ marginBottom: 12 }}>
                    <span className="mono mono-pill" style={{ fontSize: 9 }}>
                        <span className="pill-dot" />RESULTADO · SIMULACIÓN
                    </span>
                </div>
                <h2 className="wf-h2">
                    <AccentTitle text={texts.resultTitle} />
                </h2>
                <p className="wf-sub">Desliza para comparar el antes y el después.</p>
            </div>
            <div className="wf-result">{slider}</div>
            <div className="wf-result-actions wf-stagger">{actions}</div>
            <p className="mono wf-foot">SIMULACIÓN ORIENTATIVA · SEGÚN TU CASO CLÍNICO</p>
        </div>
    );
}
