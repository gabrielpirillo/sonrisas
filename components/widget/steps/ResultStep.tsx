"use client";

import { Loader2 } from "lucide-react";
import { WIcon } from "../WIcon";
import { BeforeAfterSlider } from "../BeforeAfterSlider";

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
    const beforeSrc = image ? URL.createObjectURL(image) : demoBeforeImage || "";
    const afterSrc = alignedImage || generatedImage || "";
    const ready = (image || demoBeforeImage) && generatedImage;
    const busy = isSubmittingVideo || isSubmittingPhoto;

    const slider = (
        <div className="relative w-full h-full rounded-[18px] overflow-hidden border border-[var(--line)] bg-[var(--photo)]">
            {ready ? (
                <BeforeAfterSlider beforeImage={beforeSrc} afterImage={afterSrc} fill variant="qoves" className="w-full h-full" />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                </div>
            )}
        </div>
    );

    const actions = (
        <>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onClinicalVideoRequest}>
                {isSubmittingVideo ? <Loader2 className="w-5 h-5 animate-spin" /> : <WIcon name="wa" size={17} />}
                {isSubmittingVideo ? "Enviando…" : "Quiero mi vídeo en consulta"}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onSendPhotoEmail}>
                {isSubmittingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <WIcon name="mail" size={16} />}
                {isSubmittingPhoto ? "Enviando…" : "Recibir mi foto por correo"}
            </button>
        </>
    );

    // ── Desktop: before/after (izq) + texto/CTAs (der) ──
    if (isDesktop) {
        return (
            <div className="dk-result">
                <div className="dk-result-media">{slider}</div>
                <div className="dk-result-info">
                    <span className="mono mono-pill" style={{ fontSize: 9, alignSelf: "flex-start" }}>RESULTADO · SIMULACIÓN</span>
                    <h2 className="wf-h2" style={{ marginTop: 16 }}>
                        Tu simulación <span className="dim">está lista</span>
                    </h2>
                    <p className="wf-sub" style={{ fontSize: 16, margin: "12px 0 4px" }}>Desliza sobre la imagen para comparar el antes y el después.</p>
                    <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.5, margin: "0 0 26px" }}>
                        Para verte en movimiento (vídeo), lo realizamos en consulta y confirmamos la viabilidad de tu caso con el criterio del equipo de los Dres. Corbella.
                    </p>
                    <div className="dk-result-actions">{actions}</div>
                    <p className="mono" style={{ fontSize: 9, marginTop: 22 }}>SIMULACIÓN ORIENTATIVA · SEGÚN TU CASO CLÍNICO</p>
                </div>
            </div>
        );
    }

    // ── Mobile ──
    return (
        <div className="wf-body">
            <div className="wf-intro">
                <div style={{ marginBottom: 12 }}>
                    <span className="mono mono-pill" style={{ fontSize: 9 }}>RESULTADO · SIMULACIÓN</span>
                </div>
                <h2 className="wf-h2">
                    Tu simulación <span className="dim">está lista</span>
                </h2>
                <p className="wf-sub">Desliza para comparar el antes y el después.</p>
            </div>
            <div className="wf-result">{slider}</div>
            <div className="wf-result-actions">{actions}</div>
            <p className="mono wf-foot">SIMULACIÓN ORIENTATIVA · SEGÚN TU CASO CLÍNICO</p>
        </div>
    );
}
