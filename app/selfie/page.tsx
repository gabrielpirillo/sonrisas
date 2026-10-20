"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import Webcam from "react-webcam";
import { CameraView, cameraErrorMessage } from "@/components/selfie/CameraView";
import { FaceOverlay } from "@/components/selfie/FaceOverlay";
import { useFaceDetection } from "@/hooks/selfie/useFaceDetection";
import { RefreshCcw, Check, Aperture, CameraOff, QrCode, AlertCircle } from "lucide-react";
import { Wordmark } from "@/components/admin/qoves/LogoMark";
import { useSearchParams } from "next/navigation";
import { updateSelfieSession } from "@/app/actions/selfie";
import { uploadScan } from "@/lib/services/storage";

// Fondo navy de marca (mismo degradado que las bandas oscuras de la landing)
const NAVY_BG =
    "radial-gradient(90% 60% at 15% 0%, rgba(150,190,215,0.18), transparent 70%), radial-gradient(90% 140% at 12% 0%, #2a3a47 0%, #1b2630 55%, #131b22 100%)";

function SelfieShell({ children, label }: { children: React.ReactNode; label?: string }) {
    return (
        <div
            className="min-h-[100dvh] text-white font-sans flex flex-col"
            style={{
                background: NAVY_BG,
                paddingTop: "env(safe-area-inset-top, 0px)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
        >
            <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 max-w-md w-full mx-auto">
                <Wordmark tone="light" height={18} />
                {label && (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-scan shadow-[0_0_8px_#06b6d4]" />
                        {label}
                    </span>
                )}
            </header>
            <main className="flex-1 flex flex-col items-center px-4 pb-3 min-h-0">{children}</main>
            <footer className="pb-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                Smile Fast · simulación de sonrisa
            </footer>
        </div>
    );
}

/** Mensaje centrado (enlace inválido, cámara no disponible…). */
function SelfieNotice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="my-auto w-full max-w-sm rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur-md sf-rise" role="alert">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10">{icon}</span>
            <p className="mb-2 text-[19px] font-semibold tracking-[-0.02em] text-balance">{title}</p>
            <p className="m-0 text-[15px] leading-relaxed text-white/75">{children}</p>
        </div>
    );
}

function SelfiePageContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sid");
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [camError, setCamError] = useState<string | null>(null);

    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);

    // Initial connection signal
    useEffect(() => {
        if (sessionId) {
            updateSelfieSession(sessionId, 'mobile_connected').catch(console.error);
        }
    }, [sessionId]);

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
            setUploadError(null);
        }
    }, [webcamRef]);

    const retake = () => {
        setImgSrc(null);
        setUploadError(null);
    };

    const confirmPhoto = async () => {
        if (!imgSrc || !sessionId) return;
        try {
            setUploading(true);
            setUploadError(null);
            const res = await fetch(imgSrc);
            const blob = await res.blob();
            const file = new File([blob], "mobile-selfie.jpg", { type: "image/jpeg" });

            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', 'mobile_upload');

            const uploadRes = await uploadScan(formData);
            if (!uploadRes.success || !uploadRes.data) {
                throw new Error(uploadRes.error || "Upload failed");
            }

            const sessionRes = await updateSelfieSession(sessionId, 'uploaded', uploadRes.data);
            if (!sessionRes.success) {
                throw new Error(sessionRes.error || "Session update failed");
            }

            setSuccess(true);
        } catch (err) {
            console.error("Error in mobile flow:", err);
            setUploadError("No pudimos enviar la foto. Revisa tu conexión e inténtalo de nuevo.");
        } finally {
            setUploading(false);
        }
    };

    // Sin sesión: este enlace solo funciona desde el código QR del widget.
    if (!sessionId) {
        return (
            <SelfieShell>
                <SelfieNotice icon={<QrCode className="h-6 w-6" strokeWidth={1.6} />} title="Abre el enlace desde el código QR">
                    Escanea con tu móvil el código QR que aparece en el ordenador para tomarte la selfie y enviarla.
                </SelfieNotice>
            </SelfieShell>
        );
    }

    if (success) {
        return (
            <SelfieShell label="Selfie · Recibida">
                <div className="my-auto flex flex-col items-center text-center max-w-sm sf-stagger">
                    <div className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-[0_20px_40px_-16px_rgba(6,182,212,0.6)]" style={{ background: "radial-gradient(circle at 30% 25%, #7d97aa, #4f6b7f 60%, #2a3a47)" }}>
                        <span className="absolute inset-0 rounded-full border border-scan/60 motion-safe:animate-ping" style={{ animationDuration: "2.4s" }} />
                        <Check className="w-9 h-9 text-white" strokeWidth={2} />
                    </div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.03em] leading-none mb-3">
                        ¡Foto <span className="text-blue-light">enviada!</span>
                    </h1>
                    <p className="text-white/70 mb-8 leading-relaxed">
                        Hemos recibido tu selfie correctamente. Ya puedes volver a tu ordenador para ver el resultado.
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/60">
                        Puedes cerrar esta pestaña
                    </div>
                </div>
            </SelfieShell>
        );
    }

    if (camError || error) {
        return (
            <SelfieShell>
                <SelfieNotice icon={<CameraOff className="h-6 w-6" strokeWidth={1.6} />} title="Cámara no disponible">
                    {camError || "No pudimos iniciar el detector facial. Revisa tu conexión y recarga la página."}
                </SelfieNotice>
            </SelfieShell>
        );
    }

    // Visor: ocupa el alto disponible (sin pasarse de la pantalla) para que el
    // disparador siempre quede a la vista.
    const frame = "relative w-full max-w-md flex-1 min-h-[360px] max-h-[760px] bg-navy-3 rounded-[28px] overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sf-rise";

    return (
        <SelfieShell label={imgSrc ? "Revisa tu foto" : "Selfie · Móvil"}>
            {imgSrc ? (
                <div className={frame}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc} alt="Tu selfie" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-8 z-20">
                        <button
                            type="button"
                            onClick={retake}
                            disabled={uploading}
                            aria-label="Repetir foto"
                            className="grid h-16 w-16 place-items-center rounded-full border border-white/30 bg-navy-2/55 text-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCcw className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            onClick={confirmPhoto}
                            disabled={uploading}
                            aria-label="Enviar esta foto"
                            aria-busy={uploading || undefined}
                            className="grid h-16 w-16 place-items-center rounded-full bg-blue-deep text-white shadow-[0_14px_30px_-12px_rgba(79,107,127,0.8)] transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {uploading ? (
                                <span className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                                <Check className="h-8 w-8" />
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className={frame}>
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

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                        <button
                            type="button"
                            onClick={capture}
                            disabled={!isAligned}
                            aria-label={isAligned ? "Tomar foto" : "Tomar foto (alinea tu cara y sonríe)"}
                            className={`grid h-20 w-20 place-items-center rounded-full border-4 p-0 transition-all duration-500 ${
                                isAligned
                                    ? "scale-105 cursor-pointer border-scan bg-white shadow-[0_0_0_8px_rgba(6,182,212,0.18),0_0_34px_rgba(6,182,212,0.55)]"
                                    : "cursor-not-allowed border-white/40 bg-white/10 opacity-70"
                            }`}
                        >
                            <span className={`grid h-16 w-16 place-items-center rounded-full transition-all duration-500 ${isAligned ? "bg-scan" : "bg-white/20"}`}>
                                {isAligned && <Aperture className="h-9 w-9 text-white motion-safe:animate-pulse" />}
                            </span>
                        </button>
                    </div>

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

            {uploadError ? (
                <p className="mt-4 flex max-w-xs items-start gap-2 text-left text-[14px] leading-relaxed" style={{ color: "#f0b9b1" }} role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {uploadError}
                </p>
            ) : (
                <p className="mt-4 max-w-xs text-center text-[14px] leading-relaxed text-white/60">
                    {imgSrc ? "Si te gusta, confírmala para enviarla a tu ordenador." : "Centra tu cara en el óvalo y sonríe: el botón se activa al quedar alineada."}
                </p>
            )}
        </SelfieShell>
    );
}

export default function SelfiePage() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/70" style={{ background: NAVY_BG }}>Cargando…</div>}>
            <SelfiePageContent />
        </Suspense>
    );
}
