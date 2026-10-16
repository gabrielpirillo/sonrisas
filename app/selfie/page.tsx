"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import Webcam from "react-webcam";
import { CameraView } from "@/components/selfie/CameraView";
import { FaceOverlay } from "@/components/selfie/FaceOverlay";
import { useFaceDetection } from "@/hooks/selfie/useFaceDetection";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { RefreshCcw, Check, Aperture } from "lucide-react";
import { Wordmark } from "@/components/admin/qoves/LogoMark";
import { useSearchParams } from "next/navigation";
import { updateSelfieSession } from "@/app/actions/selfie";
import { uploadScan } from "@/lib/services/storage";

// Fondo navy de marca (mismo degradado que las bandas oscuras de la landing)
const NAVY_BG =
    "radial-gradient(90% 60% at 15% 0%, rgba(150,190,215,0.18), transparent 70%), radial-gradient(90% 140% at 12% 0%, #2a3a47 0%, #1b2630 55%, #131b22 100%)";

function SelfieShell({ children, label }: { children: React.ReactNode; label?: string }) {
    return (
        <div className="min-h-[100dvh] text-white font-sans flex flex-col" style={{ background: NAVY_BG }}>
            <header className="flex items-center justify-between px-5 pt-5 pb-3 max-w-md w-full mx-auto">
                <Wordmark tone="light" height={18} />
                {label && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-scan shadow-[0_0_8px_#06b6d4]" />
                        {label}
                    </span>
                )}
            </header>
            <main className="flex-1 flex flex-col items-center justify-center px-4 pb-6">{children}</main>
            <footer className="pb-5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                Smile Fast · simulación de sonrisa
            </footer>
        </div>
    );
}

function SelfiePageContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("sid");
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

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

    // Hook handles the logic
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
        if (!imgSrc) return;

        // If we are in a cross-device session (sid present)
        if (sessionId) {
            try {
                setUploading(true);
                // 1. Convert base64 to Blob/File
                const res = await fetch(imgSrc);
                const blob = await res.blob();
                const file = new File([blob], "mobile-selfie.jpg", { type: "image/jpeg" });

                // 2. Upload to Storage
                const formData = new FormData();
                formData.append('file', file);
                formData.append('userId', 'mobile_upload'); // Or handle proper auth/anon ID

                const uploadRes = await uploadScan(formData);

                if (!uploadRes.success || !uploadRes.data) {
                    throw new Error(uploadRes.error || "Upload failed");
                }

                // 3. Update Session
                const sessionRes = await updateSelfieSession(sessionId, 'uploaded', uploadRes.data);

                if (!sessionRes.success) {
                    throw new Error(sessionRes.error || "Session update failed");
                }

                setSuccess(true);

            } catch (err) {
                console.error("Error in mobile flow:", err);
                alert("Hubo un error al subir la foto. Por favor intenta de nuevo.");
            } finally {
                setUploading(false);
            }
        } else {
            // Logic to save/use the photo (Standalone mode - redundant now with capture flow logic?)
            // Just log for now if standalone
            console.log("Photo confirmed:", imgSrc);
        }
    };

    if (success) {
        return (
            <SelfieShell label="Selfie · Recibida">
                <div className="flex flex-col items-center text-center max-w-sm sf-stagger">
                    <div className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-[0_20px_40px_-16px_rgba(6,182,212,0.6)]" style={{ background: "radial-gradient(circle at 30% 25%, #7d97aa, #4f6b7f 60%, #2a3a47)" }}>
                        <span className="absolute inset-0 rounded-full border border-scan/60 animate-ping" style={{ animationDuration: "2.4s" }} />
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

    if (error) {
        return (
            <SelfieShell>
                <div className="max-w-sm w-full rounded-3xl border border-white/15 bg-white/5 p-6 text-center backdrop-blur-md">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: "#e8a59c" }}>Cámara no disponible</p>
                    <p className="text-white/85 leading-relaxed">Error: {error}. Por favor recarga la página.</p>
                </div>
            </SelfieShell>
        )
    }

    return (
        <SelfieShell label={imgSrc ? "Revisa tu foto" : "Selfie · Móvil"}>
            {imgSrc ? (
                <div className="relative w-full max-w-md aspect-[9/16] max-h-[78dvh] bg-navy-3 rounded-[28px] overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sf-rise">
                    <Image src={imgSrc} alt="Selfie" fill className="object-cover mirror-x" />
                    <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 z-20">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={retake}
                            className="rounded-full h-16 w-16 border border-white/30 bg-navy-2/50 text-white hover:bg-navy-2/70 hover:text-white hover:scale-105 active:scale-95 transition-all backdrop-blur-md"
                        >
                            <RefreshCcw className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="default"
                            size="icon"
                            onClick={confirmPhoto}
                            disabled={uploading}
                            className={`rounded-full h-16 w-16 bg-blue-deep hover:bg-blue-ink text-white shadow-[0_14px_30px_-12px_rgba(79,107,127,0.8)] hover:scale-105 active:scale-95 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? (
                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Check className="h-8 w-8" />
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative w-full max-w-md h-[78dvh] bg-navy-3 rounded-[28px] overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sf-rise">
                    <CameraView ref={webcamRef} onUserMedia={handleUserMedia} />

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

                    <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
                        <Button
                            onClick={capture}
                            disabled={!isAligned}
                            className={`
                    rounded-full h-20 w-20 p-0 border-4 transition-all duration-500 flex items-center justify-center group
                    ${isAligned
                                    ? 'bg-white border-scan scale-110 shadow-[0_0_0_8px_rgba(6,182,212,0.18),0_0_34px_rgba(6,182,212,0.55)] cursor-pointer'
                                    : 'bg-transparent border-white/30 scale-100 opacity-60 cursor-not-allowed'
                                }
                `}
                        >
                            <div className={`
                    h-16 w-16 rounded-full transition-all duration-500
                    ${isAligned ? 'bg-scan scale-90 group-hover:scale-75' : 'bg-transparent'}
                `}>
                                {isAligned && <Aperture className="text-white h-full w-full p-3 animate-pulse" />}
                            </div>
                        </Button>
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

            <p className="mt-5 max-w-xs text-center text-[13px] leading-relaxed text-white/55">
                {imgSrc ? "Si te gusta, confírmala para enviarla a tu ordenador." : "Centra tu cara en el óvalo y sonríe: la foto se habilita al quedar alineada."}
            </p>
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
