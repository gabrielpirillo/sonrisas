"use client";

import { useEffect, useRef, useState } from "react";
import { WIcon } from "../WIcon";
import { SelfieCaptureFlow } from "@/components/selfie/SelfieCaptureFlow";

interface PhotoPanelProps {
    variant: "mobile" | "desktop";
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
    /** Mobile only: confirm "Usar esta foto" → triggers the generation pipeline. */
    onUse?: () => void;
    /** Desktop: report whether a photo is ready so the parent can enable its CTA. */
    onReady?: (ready: boolean) => void;
}

export function PhotoPanel({ variant, selectedFile, setSelectedFile, onUse, onReady }: PhotoPanelProps) {
    const [mode, setMode] = useState<"choose" | "cam">("choose");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // build / revoke an object URL for the selected file preview
    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    useEffect(() => {
        onReady?.(!!selectedFile);
    }, [selectedFile, onReady]);

    const reset = () => {
        setSelectedFile(null);
        setMode("choose");
    };

    const hasPhoto = !!selectedFile;

    return (
        <div className="photo-frame">
            {[0, 1, 2, 3].map((i) => (
                <span key={i} className="cam-tick" data-c={i} />
            ))}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                        setSelectedFile(f);
                        setMode("choose");
                    }
                    e.target.value = "";
                }}
            />

            {/* — Preview (photo ready) — */}
            {hasPhoto && previewUrl && (
                <>
                    <img src={previewUrl} alt="Tu foto" className="pf-preview" />
                    <div className="pf-actions" style={{ justifyContent: variant === "desktop" ? "center" : undefined }}>
                        <button type="button" className="pf-redo" onClick={reset} aria-label="Cambiar foto">
                            <WIcon name="refresh" size={17} />
                        </button>
                        {variant === "mobile" ? (
                            <button type="button" className="btn btn-primary" onClick={onUse}>
                                Usar esta foto
                            </button>
                        ) : (
                            <span className="dk-shot-ok">
                                <WIcon name="check" size={14} /> Foto lista
                            </span>
                        )}
                    </div>
                </>
            )}

            {/* — Live camera (real face-guided capture) — */}
            {!hasPhoto && mode === "cam" && (
                <div className="pf-camera">
                    <SelfieCaptureFlow
                        onCapture={(file) => {
                            setSelectedFile(file);
                            setMode("choose");
                        }}
                        onCancel={() => setMode("choose")}
                    />
                </div>
            )}

            {/* — Chooser inside the placeholder — */}
            {!hasPhoto && mode === "choose" && (
                <div className="pf-chooser">
                    <span className="pf-ic"><WIcon name="cam" size={24} /></span>
                    <div className="pf-choose-txt">Añade tu foto</div>
                    <div className="pf-choose-sub">Tómate una selfie o sube una imagen</div>
                    <div className="pf-btns">
                        <button type="button" className="pf-btn pf-btn-primary" onClick={() => setMode("cam")}>
                            <WIcon name="cam" size={17} /> Tomar selfie
                        </button>
                        <button type="button" className="pf-btn" onClick={() => fileInputRef.current?.click()}>
                            <WIcon name="upload" size={16} /> Subir foto
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
