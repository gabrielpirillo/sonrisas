"use client";

import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { CameraView, cameraErrorMessage } from "@/components/selfie/CameraView";
import { FaceOverlay } from "@/components/selfie/FaceOverlay";
import { useFaceDetection } from "@/hooks/selfie/useFaceDetection";
import { RefreshCcw, Check, Aperture, X, CameraOff } from "lucide-react";

interface SelfieCaptureFlowProps {
    onCapture: (file: File) => void;
    onCancel: () => void;
}

/**
 * Cámara con guía facial dentro del panel de foto del widget. Pensada para
 * paneles bajos (≈300px en teléfonos pequeños): indicación arriba, óvalo al
 * centro y controles abajo, sin solaparse.
 */
export function SelfieCaptureFlow({ onCapture, onCancel }: SelfieCaptureFlowProps) {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [camError, setCamError] = useState<string | null>(null);

    // Create a ref for the video element that useFaceDetection can key off of
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // We need to bridge the webcamRef to videoRef so our hook can see it
    const handleUserMedia = useCallback(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoRef.current = webcamRef.current.video;
        }
    }, [webcamRef]);

    const {
        isAligned,
        isSmiling,
        faceDetected,
        multipleFacesDetected,
        isLowLight,
        smileScore,
        jawOpenScore,
        isLoading,
        error,
        isCentered,
        isCorrectSize,
    } = useFaceDetection(videoRef);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setImgSrc(imageSrc);
        }
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
    };

    const confirmPhoto = async () => {
        if (imgSrc) {
            try {
                const res = await fetch(imgSrc);
                const blob = await res.blob();
                const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                onCapture(file);
            } catch (err) {
                console.error("Error converting selfie to file:", err);
            }
        }
    };

    const failure = camError || (error ? "No pudimos iniciar el detector facial. Revisa tu conexión o sube una foto." : null);
    if (failure) {
        return (
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 bg-navy-3 p-6 text-center text-white" role="alert">
                <span className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10">
                    <CameraOff className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <p className="m-0 max-w-[280px] text-[15px] leading-relaxed text-white/85">{failure}</p>
                <button
                    type="button"
                    onClick={onCancel}
                    className="min-h-12 rounded-full bg-white px-6 text-[15px] font-medium text-navy-2 transition-transform active:scale-[0.98]"
                >
                    Volver
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full min-h-[500px] md:min-h-0 flex flex-col bg-navy-3 overflow-hidden rounded-xl">
            {imgSrc ? (
                // PREVIEW STATE
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc} alt="Tu selfie" className="absolute inset-0 h-full w-full object-cover" />

                    <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-6">
                        <button
                            type="button"
                            onClick={retake}
                            aria-label="Repetir foto"
                            className="grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-navy-2/55 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95"
                        >
                            <RefreshCcw className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={confirmPhoto}
                            aria-label="Usar esta foto"
                            className="grid h-14 w-14 place-items-center rounded-full bg-blue-deep text-white shadow-[0_14px_30px_-12px_rgba(79,107,127,0.8)] transition-transform hover:scale-105 active:scale-95"
                        >
                            <Check className="h-7 w-7" />
                        </button>
                    </div>
                </div>
            ) : (
                // CAMERA STATE
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black">
                    <div className="relative w-full h-full overflow-hidden">
                        <CameraView
                            ref={webcamRef}
                            onUserMedia={handleUserMedia}
                            onUserMediaError={(e) => setCamError(cameraErrorMessage(e))}
                        />

                        {!isLoading && (
                            <FaceOverlay
                                isAligned={isAligned}
                                isSmiling={isSmiling}
                                faceDetected={faceDetected}
                                multipleFacesDetected={multipleFacesDetected}
                                isLowLight={isLowLight}
                                smileScore={smileScore}
                                jawOpenScore={jawOpenScore}
                                isCentered={isCentered}
                                isCorrectSize={isCorrectSize}
                            />
                        )}
                    </div>

                    {/* Controles: cancelar (izq.) + disparador (centro) */}
                    <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center">
                        <button
                            type="button"
                            onClick={onCancel}
                            aria-label="Cancelar"
                            className="absolute left-4 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-navy-2/55 text-white backdrop-blur-md transition-transform active:scale-95"
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={capture}
                            disabled={!isAligned}
                            aria-label={isAligned ? "Tomar foto" : "Tomar foto (alinea tu cara y sonríe)"}
                            className={`grid h-16 w-16 place-items-center rounded-full border-4 p-0 transition-all duration-500 ${
                                isAligned
                                    ? "scale-105 cursor-pointer border-scan bg-white shadow-[0_0_0_8px_rgba(6,182,212,0.18),0_0_34px_rgba(6,182,212,0.55)]"
                                    : "cursor-not-allowed border-white/40 bg-white/10 opacity-70"
                            }`}
                        >
                            <span
                                className={`grid h-12 w-12 place-items-center rounded-full transition-all duration-500 ${isAligned ? "bg-scan" : "bg-white/20"}`}
                            >
                                {isAligned && <Aperture className="h-7 w-7 text-white motion-safe:animate-pulse" />}
                            </span>
                        </button>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-navy-3/85 z-30 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-[3px] border-scan border-t-transparent rounded-full animate-spin" />
                                <p className="text-white/85 font-mono text-[10px] uppercase tracking-[0.18em]">Iniciando cámara…</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
