"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
// Supabase client removed — using internal API routes instead
import { analyzeImageAndGeneratePrompts, generateSmileVariation } from "@/lib/services/gemini";
import { validateStaticImage } from "@/utils/faceValidation";
import { uploadScan, uploadGeneratedImageAction } from "@/lib/services/storage";
import { VariationType } from "@/types/gemini";
import { alignGeneratedToReference } from "@/utils/alignFaces";
import { createSelfieSession } from "@/app/actions/selfie";
import { countries } from "./countries";
import type { Step, ProcessStatus, FormValues, WidgetContainerProps } from "./types";
import { getFaceLandmarker } from "@/lib/mediapipe/faceLandmarker";
import { useWidgetConfig } from "./WidgetConfigContext";
import { customFieldsComplete, widgetWhatsappHref } from "@/lib/widgetConfig";

/** Proporciones que admite el modelo de imagen; elegimos la más cercana a la foto. */
const IMAGE_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"] as const;
const closestRatio = (w: number, h: number): string => {
    if (!w || !h) return "3:4";
    const target = w / h;
    let best: string = "3:4";
    let diff = Infinity;
    for (const r of IMAGE_RATIOS) {
        const [a, b] = r.split(":").map(Number);
        const d = Math.abs(Math.log(a / b) - Math.log(target));
        if (d < diff) { diff = d; best = r; }
    }
    return best;
};
const imageSize = (src: string) =>
    new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = src;
    });

/** Error con un mensaje pensado para mostrarse tal cual al paciente. */
class WidgetError extends Error {
    readonly userFacing = true;
}

// Helper to convert base64 to File
const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

// Image Compression
const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const MAX_WIDTH = 2000;
                const MAX_HEIGHT = 2000;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 1.0));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

const PROCESSING_PHRASES = [
    "Estás a un paso de tu mejor versión",
    "Estamos afinando tu nueva sonrisa",
    "Ya casi está lista",
    "Preparando tu simulación Smile Fast"
];

export function useWidgetState(props: WidgetContainerProps = {}) {
    const { config: widgetConfig, preview: isPreview } = useWidgetConfig();
    const { initialStep, initialBeforeImage, initialAfterImage } = props;

    // ─── Core State ──────────────────────────────────────────
    const [step, setStep] = useState<Step>(initialStep || "LEAD_FORM");
    // Verificación de Cloudflare Turnstile deshabilitada: se arranca como verificado
    // para no bloquear el acceso al widget (el siteKey estaba atado a otro dominio).
    const [isVerified, setIsVerified] = useState(true);
    const [image, setImage] = useState<File | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(initialAfterImage || null);
    const [demoBeforeImage, setDemoBeforeImage] = useState<string | null>(initialBeforeImage || null);
    const [analysisId, setAnalysisId] = useState<string | null>(null);

    // ─── Lead / User State ───────────────────────────────────
    const [leadIntent, setLeadIntent] = useState<'image' | 'video'>('image');
    const [selectedCountry, setSelectedCountry] = useState<string>('ES');
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
    const [userId, setUserId] = useState<string>("anon");
    const [leadId, setLeadId] = useState<string | null>(null);
    // Clave pública de la clínica dueña del widget (?key= en la URL del embed).
    // Sin clave, el servidor usa la clínica por defecto.
    const [clinicKey] = useState<string | null>(() =>
        typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('key')
    );
    const [userEmail, setUserEmail] = useState<string>('');
    const [userName, setUserName] = useState<string>('Usuario');
    const [userPhone, setUserPhone] = useState<string>('');

    // ─── Process State ───────────────────────────────────────
    const [processStatus, setProcessStatus] = useState<ProcessStatus>('idle');
    const [uploadedScanUrl, setUploadedScanUrl] = useState<string | null>(null);
    const [alignedImage, setAlignedImage] = useState<string | null>(null);

    const [isClinicalRequestSent, setIsClinicalRequestSent] = useState(false);
    const [isPhotoEmailSent, setIsPhotoEmailSent] = useState(false);

    // ─── Loading State ───────────────────────────────────────
    const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);
    const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Enviando tu simulación…");

    // ─── Cross-Device Session State ──────────────────────────
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [qrUrl, setQrUrl] = useState<string | null>(null);
    const [mobileConnected, setMobileConnected] = useState(false);

    // ─── Form State ──────────────────────────────────────────
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formValues, setFormValues] = useState<FormValues>({
        name: '',
        email: '',
        phoneNumber: '',
        ageAccepted: false,
        custom: {},
        termsAccepted: false
    });

    // ─── Animated Phrases ────────────────────────────────────
    const [phraseIndex, setPhraseIndex] = useState(0);

    // ─── Refs ────────────────────────────────────────────────
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Effects ─────────────────────────────────────────────

    // Rotating processing phrases
    useEffect(() => {
        if (step === "PROCESSING") {
            const interval = setInterval(() => {
                setPhraseIndex((prev) => (prev + 1) % PROCESSING_PHRASES.length);
            }, 3000);
            return () => clearInterval(interval);
        } else {
            setPhraseIndex(0);
        }
    }, [step]);

    // Precarga el detector de rostro (≈4 MB) en segundo plano para que
    // "Ver mi simulación" no se quede congelado descargándolo.
    useEffect(() => {
        const preload = () => { getFaceLandmarker("IMAGE", { numFaces: 2 }).catch(() => {}); };
        const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(preload);
        else setTimeout(preload, 1500);
    }, []);

    // Detect user's country
    useEffect(() => {
        const detectCountry = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                if (data.country_code) {
                    const detectedCountry = countries.find(c => c.code === data.country_code);
                    if (detectedCountry) {
                        setSelectedCountry(data.country_code);
                    }
                }
            } catch (error) {
                console.log('Geolocation detection failed, using default (ES)');
            }
        };
        detectCountry();
    }, []);

    // Initialize Selfie Session
    useEffect(() => {
        if (step === "SELFIE_CAPTURE" && !sessionId) {
            const initSession = async () => {
                const res = await createSelfieSession();
                if (res.success && res.sessionId) {
                    setSessionId(res.sessionId);
                    setQrUrl(`${window.location.origin}/selfie?sid=${res.sessionId}`);
                }
            };
            initSession();
        }
    }, [step, sessionId]);

    // Listen for Selfie Session updates (Polling — replaces Supabase Realtime)
    useEffect(() => {
        if (!sessionId || step !== "SELFIE_CAPTURE") return;

        let active = true;
        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'get_selfie_session', data: { session_id: sessionId } })
                });
                const result = await res.json();
                if (!active || !result.data) return;

                const { status: newStatus, image_url: imageUrl } = result.data;

                if (newStatus === 'mobile_connected') {
                    setMobileConnected(true);
                }

                if (newStatus === 'uploaded' && imageUrl) {
                    clearInterval(pollInterval);
                    try {
                        const response = await fetch(imageUrl);
                        const blob = await response.blob();
                        const file = new File([blob], "mobile-selfie.jpg", { type: "image/jpeg" });
                        handleUpload(file);
                    } catch (err) {
                        console.error("Error fetching mobile selfie:", err);
                        toast.error("Error recuperando la foto del móvil.");
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 2000);

        return () => {
            active = false;
            clearInterval(pollInterval);
        };
    }, [sessionId, step]);

    // ─── Handlers ────────────────────────────────────────────

    const handleSelfieCapture = async (file: File) => {
        setSelectedFile(file);
        setStep("LEAD_FORM");
    };

    const handleUpload = async (file: File) => {
        if (isPreview) {
            toast.info("Vista previa", { description: "Aquí tu paciente vería su simulación. En la vista previa no se guardan datos." });
            return;
        }
        try {
            // Feedback inmediato mientras se valida la foto
            setImage(file);
            setStep("PROCESSING");
            setProcessStatus('validating');

            // 1. Strict Validation (MediaPipe)
            const validation = await validateStaticImage(file);
            if (!validation.isValid) {
                throw new WidgetError(validation.reason || "La foto no es válida. Prueba con otra.");
            }

            // Save lead if not saved yet
            let currentLeadId = leadId;
            if (!currentLeadId) {
                const newLeadId = crypto.randomUUID();
                const countryDialCode = countries.find(c => c.code === selectedCountry)?.dial_code || '+34';
                const fullPhone = `${countryDialCode} ${formValues.phoneNumber}`;

                const leadRes = await fetch('/api/db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'insert_lead',
                        data: {
                            id: newLeadId,
                            name: formValues.name,
                            email: formValues.email,
                            phone: widgetConfig.features.askPhone ? fullPhone.trim() : '',
                            clinic_key: clinicKey,
                            custom_answers: formValues.custom
                        }
                    })
                });
                const leadResult = await leadRes.json().catch(() => ({}));
                if (!leadResult.success) {
                    throw new WidgetError(leadResult.error || "No pudimos guardar tus datos. Inténtalo de nuevo.");
                }

                setLeadId(newLeadId);
                currentLeadId = newLeadId;
                setUserEmail(formValues.email);
                setUserName(formValues.name);
                setUserPhone(fullPhone.trim());
            }

            const base64 = await compressImage(file);
            setProcessStatus('scanning');

            // 2. Upload to Storage
            const compressedBlob = await (await fetch(base64)).blob();
            const compressedFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', compressedFile);

            const anonUserId = 'anon_' + crypto.randomUUID();
            setUserId(anonUserId);
            formData.append('userId', anonUserId);

            let localScanUrl = null;
            let localScanPath = null;
            const uploadRes = await uploadScan(formData);
            if (uploadRes.success && uploadRes.data) {
                localScanUrl = uploadRes.data;
                localScanPath = uploadRes.path;
                setUploadedScanUrl(localScanUrl);
            } else {
                console.warn("Fallo subida de imagen original:", uploadRes.error);
            }

            setProcessStatus('analyzing');

            // 3. Analyze Image
            const analysisFormData = new FormData();
            if (localScanPath) {
                analysisFormData.append('imagePath', localScanPath);
            } else if (localScanUrl) {
                analysisFormData.append('imageUrl', localScanUrl);
            } else {
                const analysisFile = base64ToFile(base64, 'analysis_input.jpg');
                analysisFormData.append('file', analysisFile);
            }

            const analysisResponse = await analyzeImageAndGeneratePrompts(analysisFormData);
            if (!analysisResponse.success) {
                const error = analysisResponse.errorDetails;
                toast.error(error?.title || "Error analizando imagen", {
                    description: error?.message,
                    icon: error?.icon
                });
                throw new Error(analysisResponse.error || "Error analizando imagen");
            }

            const analysisResult = analysisResponse.data;
            if (!analysisResult) throw new Error("No se pudo obtener el análisis.");

            setProcessStatus('designing');

            // 4. Auto-Generate Smile
            const naturalVariation = analysisResult.variations.find((v: { type: VariationType }) => v.type === VariationType.ORIGINAL_BG);
            if (!naturalVariation) throw new Error("No se encontró plan de restauración natural.");

            if (analysisResult.analysis_id) {
                setAnalysisId(analysisResult.analysis_id);
            }

            const fallbackPrompt = naturalVariation.prompt_data.Subject || "Smile Design";

            const genFormData = new FormData();
            if (localScanPath) {
                genFormData.append('imagePath', localScanPath);
            } else if (localScanUrl) {
                genFormData.append('imageUrl', localScanUrl);
            } else {
                const genFile = base64ToFile(base64, 'generation_input.jpg');
                genFormData.append('file', genFile);
            }
            genFormData.append('variationPrompt', fallbackPrompt);
            const dims = await imageSize(base64);
            genFormData.append('aspectRatio', closestRatio(dims.w, dims.h));
            genFormData.append('userId', anonUserId);
            if (analysisResult.analysis_id) genFormData.append('analysisId', analysisResult.analysis_id);
            genFormData.append('variationType', VariationType.ORIGINAL_BG);
            if (clinicKey) genFormData.append('clinicKey', clinicKey);

            const genResult = await generateSmileVariation(genFormData);

            if (!genResult.success || !genResult.data) {
                const error = genResult.errorDetails;
                toast.error(error?.title || "Fallo en la generación", {
                    description: error?.message,
                    icon: error?.icon
                });
                throw new Error(genResult.error || "Fallo en la generación de sonrisa");
            }

            setGeneratedImage(genResult.data);

            // 5. Align Faces
            setProcessStatus('aligning');
            const alignResult = await alignGeneratedToReference(base64, genResult.data);
            let finalAlignedUrl = genResult.data;
            if (alignResult.success) {
                finalAlignedUrl = alignResult.alignedUrl;
                setAlignedImage(finalAlignedUrl);
            } else {
                console.warn("[WidgetContainer] Pre-alignment failed:", alignResult.error);
                setAlignedImage(finalAlignedUrl);
            }

            setProcessStatus('complete');
            await new Promise(r => setTimeout(r, 800));

            // Auto-save and show result
            if (currentLeadId) {
                try {
                    let outputUrl = finalAlignedUrl;
                    if (finalAlignedUrl?.startsWith('data:')) {
                        const file = base64ToFile(finalAlignedUrl, 'aligned_smile.png');
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('userId', currentLeadId);
                        formData.append('type', 'aligned');
                        outputUrl = await uploadGeneratedImageAction(formData);
                    }

                    const genRes = await fetch('/api/db', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'insert_generation',
                            data: {
                                lead_id: currentLeadId,
                                type: 'image',
                                status: 'completed',
                                input_path: localScanUrl || 'unknown',
                                output_path: outputUrl,
                                metadata: { source: 'widget_v1' }
                            }
                        })
                    });
                    const genResult = await genRes.json();
                    if (!genResult.success) console.error("Error saving generation:", genResult.error);

                    setStep("RESULT");
                } catch (autoErr) {
                    console.error("Auto-save error:", autoErr);
                    setStep("LOCKED_RESULT");
                }
            } else {
                setStep("LOCKED_RESULT");
            }

        } catch (err) {
            console.error("WidgetContainer Error:", err);

            const message: string = err instanceof Error ? err.message : "";
            if (err instanceof WidgetError) {
                toast.error(message);
            } else if (!message.includes("analizando imagen") && !message.includes("generación de sonrisa")) {
                toast.error("No pudimos procesar tu foto. Inténtalo de nuevo en unos segundos.");
            }

            setStep((prev) => {
                if (prev === "PROCESSING") return "LEAD_FORM";
                return prev;
            });
            setImage(null);
            setSelectedFile(null);
        }
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    };

    const handleVideoRequest = () => {
        setIsVideoDialogOpen(false);
        toast.info("Solicitud enviada.", { description: "Te contactaremos pronto." });
    };

    const videoWhatsappHref = widgetWhatsappHref(widgetConfig, userName === "Usuario" ? "" : userName);

    const handleClinicalVideoRequest = () => {
        // Abrir WhatsApp dentro del mismo clic (si no, el navegador lo bloquea).
        window.open(videoWhatsappHref, "_blank", "noopener,noreferrer");
        setIsClinicalRequestSent(true);
        setStep("CLINICAL_REQUEST_SUCCESS");

        // Registrar la solicitud en el panel de la clínica (en segundo plano).
        if (leadId) {
            fetch('/api/email/clinical-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadId }),
            }).catch((err) => console.warn("No se pudo registrar la solicitud de vídeo:", err));
        }
    };

    const handleSendPhotoEmail = async () => {
        setIsSubmittingPhoto(true);
        setLoadingMessage("Enviando tu simulación…");

        const timeoutId = setTimeout(() => {
            setLoadingMessage("Ya casi está…");
        }, 3000);

        try {
            const response = await fetch('/api/email/send-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    name: userName,
                    imageUrl: generatedImage,
                    leadId: leadId
                })
            });

            if (response.ok) {
                setIsPhotoEmailSent(true);
                setStep("PHOTO_SUCCESS");
            } else {
                console.error('Email error');
                throw new Error("Email sending failed");
            }
        } catch (emailErr) {
            console.error('Email invoke error:', emailErr);
            toast.error("No pudimos enviar el correo. Inténtalo de nuevo en unos segundos.");
        } finally {
            clearTimeout(timeoutId);
            setIsSubmittingPhoto(false);
        }
    };

    const handleSurveySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadId) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const surveyData = {
            ageRange: formData.get('ageRange'),
            improvementGoal: formData.get('improvementGoal'),
            timeframe: formData.get('timeframe'),
            clinicPreference: formData.get('clinicPreference')
        };

        try {
            const surveyRes = await fetch('/api/db', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_lead_survey',
                    data: { lead_id: leadId, survey_data: surveyData }
                })
            });
            const surveyResult = await surveyRes.json();
            if (!surveyResult.success) throw new Error(surveyResult.error);

            toast.success("Gracias por tus respuestas");
            setStep("VERIFICATION");
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar respuestas.");
        }
    };

    const resetToUpload = () => {
        setStep("UPLOAD");
        setImage(null);
        setGeneratedImage(null);
    };

    const isFormComplete = !!(
        formValues.name &&
        formValues.email &&
        (!widgetConfig.features.askPhone || formValues.phoneNumber) &&
        formValues.ageAccepted &&
        formValues.termsAccepted &&
        customFieldsComplete(widgetConfig.customFields, formValues.custom)
    );

    // ─── Return ──────────────────────────────────────────────
    return {
        // State
        step,
        setStep,
        isVerified,
        setIsVerified,
        image,
        generatedImage,
        demoBeforeImage,
        alignedImage,
        processStatus,
        formValues,
        setFormValues,
        selectedFile,
        setSelectedFile,
        selectedCountry,
        setSelectedCountry,
        userEmail,
        leadId,
        isSubmittingPhoto,
        isSubmittingVideo,
        loadingMessage,
        sessionId,
        qrUrl,
        mobileConnected,
        setMobileConnected,
        phraseIndex,
        isFormComplete,

        // Refs
        fileInputRef,

        // Handlers
        handleUpload,
        handleSelfieCapture,
        handleLeadSubmit,
        handleVideoRequest,
        handleClinicalVideoRequest, videoWhatsappHref,
        handleSendPhotoEmail,
        handleSurveySubmit,
        resetToUpload,

        // Constants
        phrases: PROCESSING_PHRASES,
    };
}

export type WidgetState = ReturnType<typeof useWidgetState>;
