"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Mail, Phone, User, ImageIcon, MonitorPlay,
    Share2, CheckCircle2, Loader2, Archive, Trees, Home,
    Briefcase, Wine, Palmtree, Trash2, XCircle, AlertCircle,
    ChevronLeft, Send, Check
} from "lucide-react";
import { BeforeAfterSlider } from "@/components/widget/BeforeAfterSlider";
// Supabase client removed — using internal API routes
import { toast } from "sonner";
import { deleteLeadAction } from "@/app/(admin)/administracion/leads/actions";
import { StatusPill } from "@/components/admin/qoves/StatusPill";
import { LEAD_STATUS } from "@/lib/brand";

/* ── Lead-modal helpers · lenguaje visual Smile Fast (navy / azul acero) ── */
const Q_GOAL: Record<string, string> = { alignment: "Alineación", veneers: "Carillas", implants: "Implantes", full_smile: "Sonrisa completa", whitening: "Blanqueamiento" };
const Q_TIME: Record<string, string> = { now: "Ahora", "1-3_months": "1-3 meses", later: "Más adelante" };
const STATUS_CHOICES = ["pending", "contacted", "converted"] as const;

const NAVY_BG =
    "radial-gradient(80% 55% at 0% 0%, rgba(142,164,180,0.30), transparent 62%)," +
    "radial-gradient(70% 50% at 100% 100%, rgba(185,207,221,0.16), transparent 65%)," +
    "linear-gradient(165deg, var(--navy-1), var(--navy-2) 55%, var(--navy-3))";

const SPRING = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } as const;

/** Iniciales sobre círculo navy con brillo azul (avatar del lead). */
function NavyAvatar({ initials, size = 44, glass = false }: { initials: string; size?: number; glass?: boolean }) {
    return (
        <span
            aria-hidden
            style={{
                width: size, height: size, borderRadius: "50%", flexShrink: 0,
                display: "grid", placeItems: "center",
                color: glass ? "#fff" : "var(--blue-light)",
                fontSize: Math.round(size * 0.32), fontWeight: 600, letterSpacing: "0.02em",
                background: glass
                    ? "rgba(255,255,255,0.14)"
                    : "radial-gradient(120% 120% at 20% 0%, rgba(185,207,221,0.38), transparent 55%), linear-gradient(150deg, var(--navy-1), var(--navy-2) 60%, var(--navy-3))",
                border: glass ? "1px solid rgba(255,255,255,0.22)" : "none",
                backdropFilter: glass ? "blur(10px)" : undefined,
                boxShadow: glass ? undefined : "0 10px 22px -12px rgba(19,27,34,0.85), inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}
        >
            {initials}
        </span>
    );
}

function DContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0", borderTop: "1px solid var(--line)" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: "var(--blue-tint)", border: "1px solid var(--blue-line)", display: "grid", placeItems: "center", color: "var(--blue-deep)", flexShrink: 0 }}>{icon}</span>
            <div style={{ minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 8.5, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
            </div>
        </div>
    );
}

/** Fila clave-valor con etiqueta mono (cuestionario). */
function KVRow({ label, value, first = false }: { label: string; value: React.ReactNode; first?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 16px", borderTop: first ? "none" : "1px solid var(--line)" }}>
            <span className="mono" style={{ fontSize: 9, flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", textAlign: "right", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "—"}</span>
        </div>
    );
}

/** Pastilla seleccionable de estado (colores de LEAD_STATUS). */
function StatusChoice({ status, active, disabled, onClick }: { status: string; active: boolean; disabled?: boolean; onClick: () => void }) {
    const s = LEAD_STATUS[status] || LEAD_STATUS.pending;
    return (
        <motion.button
            type="button"
            whileTap={disabled ? undefined : { scale: 0.96 }}
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 14px 8px 11px", borderRadius: 99,
                border: `1px solid ${active ? s.border : "var(--blue-line)"}`,
                background: active ? s.bg : "#fff",
                color: active ? s.text : "var(--ink-2)",
                fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: active ? 600 : 450,
                cursor: disabled ? "progress" : active ? "default" : "pointer",
                boxShadow: active ? "0 8px 18px -12px rgba(27,38,48,0.55)" : "none",
                transition: "background .25s var(--ease), border-color .25s var(--ease), color .25s var(--ease), box-shadow .25s var(--ease)",
                opacity: disabled && !active ? 0.6 : 1,
            }}
        >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, boxShadow: status === "converted" && active ? "0 0 8px 1px rgba(185,207,221,0.8)" : undefined }} />
            {s.label}
            {active && <Check size={13} strokeWidth={2.4} />}
        </motion.button>
    );
}

interface LeadDetailModalProps {
    lead: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLeadUpdated?: () => void;
}

// ─── Video generation stages (simulated progress) ──────────────────────────
const VIDEO_STAGES = [
    { at: 0, label: "🔍 Analizando imagen..." },
    { at: 10, label: "🎨 Generando escena..." },
    { at: 28, label: "🎬 Inicializando video..." },
    { at: 45, label: "⚙️  Renderizando fotogramas..." },
    { at: 68, label: "✨ Aplicando efectos finales..." },
    { at: 85, label: "📦 Guardando resultado..." },
    { at: 93, label: "🏁 Casi listo..." },
];

const TOTAL_ESTIMATED_MS = 115_000;
const TICK_MS = 800;
const MAX_AUTO_PROGRESS = 94;

export function LeadDetailModal({ lead, open, onOpenChange, onLeadUpdated }: LeadDetailModalProps) {
    const [loadingAction, setLoadingAction] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [videoGen, setVideoGen] = useState<any>(null);
    const [viewMode, setViewMode] = useState<"video" | "images">("images");
    const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Progress state
    const [videoProgress, setVideoProgress] = useState(0);
    const [videoStage, setVideoStage] = useState("");
    const [sendingVideo, setSendingVideo] = useState(false);
    const [sendingPhoto, setSendingPhoto] = useState(false);
    const [mobileTab, setMobileTab] = useState<"info" | "video" | "gestion">("info");
    const [settingStatus, setSettingStatus] = useState(false);
    const reduceMotion = useReducedMotion();

    // ── Browser Notification helpers ─────────────────────────────────────
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

    // Request notification permission on first render
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(perm => {
                console.log('[Notification] Permission:', perm);
            });
        }
        // Pre-create audio element for notification sound
        if (typeof window !== 'undefined' && !notificationSoundRef.current) {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1eXGBkamtzd350b2ZfWFVTU1dcY2x1fYOIioyKhoB5cWliXFpbX2VsdHuBhYmLjIuJhX94cWlhW1lZXWNqcnl/g4eKi4uKiIR+d3BpYlxaWl5ka3J5f4OHiouLioiEfndwamNdW1teZGtzeYCEiIuMi4qIhH53cGpiXVtbX2VscnqAhYmLjIuJh4N9dnBqY11bW19la3N6gIWJi4yLioiDfXZvaWNdW1tfZGtzeoGFiYuMi4qIg312b2ljXVtbX2Rrc3qBhYmLjIuKiIN9dm9pY11bW19ka3N6gYWJi4yLioiDfXZwamNeXFxgZm10e4GGiYuLioiEfnhxamRfXV1hZ250e4KGiouLioiFf3hxamRfXV1hZm10fIKHiouLioiFgHlya2RfXl1hZm11fIKHiouLioiFgHlya2VgXl5hZm11fIKHiouLioiFgHlya2VgXl5hZm51fIKH');
            audio.volume = 0.5;
            notificationSoundRef.current = audio;
        }
    }, []);

    const sendBrowserNotification = useCallback((title: string, body: string, isError = false) => {
        // Play notification sound
        try {
            notificationSoundRef.current?.play().catch(() => {});
        } catch (_) {}

        // Send native browser notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: isError ? '❌' : '🎬',
                badge: '/favicon.ico',
                tag: 'video-generation',
                requireInteraction: true,
            });
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }, []);

    // Reset simple states when lead changes
    useEffect(() => {
        if (open) {
            setSelectedScenario(null);
            setViewMode("images");
            setVideoProgress(0);
            setVideoStage("");
            setErrorMessage(null);
            console.log(`[VideoDebug] Modal opened for Lead ID: ${lead?.id}`);
        }
    }, [lead?.id, open]);

    // ── Refs ──────────────────────────────────────────────────────────────
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const generatingRef = useRef(false);
    const stopProgressRef = useRef<(completed?: boolean) => void>(() => { });

    const storageBaseUrl = process.env.NEXT_PUBLIC_STORAGE_URL || "";

    const scenarios = [
        { id: "park", label: "Parque", icon: Trees, description: "Exterior natural, luz de día" },
        { id: "home", label: "Hogar", icon: Home, description: "Interior cálido, entorno familiar" },
        { id: "office", label: "Oficina", icon: Briefcase, description: "Profesional, ambiente de trabajo" },
        { id: "dinner", label: "Cena", icon: Wine, description: "Social, noche, alta gama" },
        { id: "beach", label: "Playa", icon: Palmtree, description: "Vacaciones, sol y mar" },
    ];

    // ── Progress helpers ────────────────────────────────────────────────────

    const stopProgress = useCallback((completed = false) => {
        if (progressRef.current) {
            console.log(`[VideoDebug] Stopping simulated progress. Completed? ${completed}`);
            clearInterval(progressRef.current);
            progressRef.current = null;
        }
        if (completed) {
            setVideoProgress(100);
            setVideoStage("✅ ¡Vídeo listo!");
        }
    }, []);

    stopProgressRef.current = stopProgress;

    const startProgress = useCallback(() => {
        console.log("[VideoDebug] Starting simulated progress bar...");
        stopProgress(false);
        setVideoProgress(0);
        setVideoStage(VIDEO_STAGES[0].label);

        const increment = (MAX_AUTO_PROGRESS / (TOTAL_ESTIMATED_MS / TICK_MS));

        progressRef.current = setInterval(() => {
            setVideoProgress(prev => {
                const next = Math.min(prev + increment, MAX_AUTO_PROGRESS);
                const stage = [...VIDEO_STAGES].reverse().find(s => next >= s.at);
                if (stage) setVideoStage(stage.label);

                // Loguear solo saltos grandes para no saturar consola
                if (Math.floor(next) % 10 === 0 && Math.floor(next) !== Math.floor(prev)) {
                    // console.log(`[VideoDebug] Progress: ${Math.floor(next)}%`);
                }
                return next;
            });
        }, TICK_MS);
    }, [stopProgress]);

    // ── Polling & Cancellation ──────────────────────────────────────────────

    const clearPollingInterval = useCallback(() => {
        if (pollingRef.current) {
            console.log("[VideoDebug] 🛑 Clearing Polling Interval.");
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback((generationId: string) => {
        clearPollingInterval();
        console.log(`[VideoDebug] 🚀 Start Polling for Generation ID: ${generationId}`);
        setErrorMessage(null);

        let isPollingActive = true;

        pollingRef.current = setInterval(async () => {
            if (!isPollingActive || !generatingRef.current) {
                console.log("[VideoDebug] Polling aborted (component unmounted or stopped manually).");
                clearPollingInterval();
                return;
            }

            try {
                console.log(`[VideoDebug] Pinging check-video...`);
                const start = Date.now();
                const checkRes = await fetch('/api/ai/video/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ generation_id: generationId }),
                });
                const data = await checkRes.json();
                console.log(`[VideoDebug] Ping response in ${Date.now() - start}ms. Status: ${data?.status}`);

                if (!checkRes.ok) throw new Error(data?.error || 'Check video failed');

                // CASO 1: COMPLETED
                if (data?.status === "completed") {
                    console.log("[VideoDebug] ✅ STATUS COMPLETED DETECTED!");

                    isPollingActive = false;
                    clearPollingInterval();

                    console.log("[VideoDebug] Forcing progress to 100%...");
                    stopProgressRef.current(true);

                    setVideoProgress(100);
                    setVideoStage("✅ Finalizando...");

                    setTimeout(() => {
                        console.log("[VideoDebug] Timeout finished. Switching UI to Video View.");
                        if (generatingRef.current) {
                            generatingRef.current = false;
                            setGeneratingVideo(false);
                            setVideoGen(data);
                            setViewMode("video");
                            toast.success("¡Vídeo generado con éxito! 🎉");
                            sendBrowserNotification(
                                '🎬 ¡Video listo!',
                                `El video de ${lead?.name || 'el lead'} se generó con éxito. Haz clic para verlo.`
                            );
                            onLeadUpdated?.();
                        }
                    }, 800);

                    // CASO 2: ERROR/FAILED
                } else if (data?.status === "error" || data?.status === "failed") {
                    console.error("[VideoDebug] ❌ STATUS FAILED/ERROR:", data);

                    isPollingActive = false;
                    clearPollingInterval();
                    stopProgressRef.current(false);
                    generatingRef.current = false;
                    setGeneratingVideo(false);

                    const rawError = data.error?.message || data.error || data.metadata?.error?.message || data.metadata?.error || "";
                    const rawStr = typeof rawError === 'string' ? rawError : JSON.stringify(rawError);

                    // Translate technical errors to user-friendly Spanish messages
                    let errorMsg: string;
                    if (rawStr.includes('audio') || rawStr.includes('safety') || rawStr.includes('RAI_FILTERED')) {
                        errorMsg = "El filtro de seguridad de Google bloqueó la generación. Intenta con otro escenario o con una foto diferente.";
                    } else if (rawStr.includes('RESOURCE_EXHAUSTED') || rawStr.includes('429') || rawStr.includes('quota')) {
                        errorMsg = "Se alcanzó el límite de generaciones por ahora. Espera unos minutos e intenta de nuevo.";
                    } else if (rawStr.includes('503') || rawStr.includes('UNAVAILABLE') || rawStr.includes('unavailable')) {
                        errorMsg = "El servicio de generación de video está temporalmente fuera de línea. Intenta de nuevo en unos minutos.";
                    } else if (rawStr.includes('No smile image') || rawStr.includes('No completed')) {
                        errorMsg = "No se encontró la imagen de sonrisa. Genera primero la imagen antes de crear el video.";
                    } else if (rawStr.includes('timeout') || rawStr.includes('DEADLINE')) {
                        errorMsg = "La generación tardó demasiado tiempo. Intenta de nuevo.";
                    } else if (rawStr.includes('could not create your video')) {
                        errorMsg = "No se pudo crear el video con esta combinación. Prueba con otro escenario.";
                    } else if (rawStr.includes('400') || rawStr.includes('INVALID')) {
                        errorMsg = "Hubo un problema con la solicitud. Intenta con otra foto o escenario.";
                    } else if (rawStr && rawStr !== '{}') {
                        errorMsg = "Ocurrió un problema durante la generación. Intenta de nuevo o prueba con otro escenario.";
                    } else {
                        errorMsg = "La generación no se completó. Intenta de nuevo con otro escenario.";
                    }

                    console.error('[VideoDebug] Raw error:', rawStr, '→ User message:', errorMsg);
                    setErrorMessage(errorMsg);
                    toast.error("Error al generar vídeo");
                    sendBrowserNotification(
                        '❌ Error en video',
                        `No se pudo generar el video de ${lead?.name || 'el lead'}. ${errorMsg}`,
                        true
                    );
                    onLeadUpdated?.();
                } else {
                    console.log(`[VideoDebug] Still processing... (Status: ${data?.status})`);
                }

            } catch (err) {
                console.error("[VideoDebug] Network Error during poll (ignoring):", err);
            }
        }, 4000);
    }, [clearPollingInterval, onLeadUpdated]);

    // Función para cancelar
    const handleCancelGeneration = async () => {
        if (!videoGen?.id) return;

        console.log("[VideoDebug] User requested cancellation.");
        clearPollingInterval();
        stopProgress(false);
        setGeneratingVideo(false);
        generatingRef.current = false;
        toast.info("Cancelando generación...");

        try {
            await fetch('/api/ai/video/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ generation_id: videoGen.id })
            });
            console.log("[VideoDebug] Cancel request sent to server successfully.");
            setErrorMessage("Generación cancelada por el usuario.");
            toast.success("Generación cancelada");
        } catch (e) {
            console.error("[VideoDebug] Error sending cancel request:", e);
            toast.error("No se pudo cancelar en el servidor (pero se detuvo localmente)");
        }
    };

    // ── Cleanup ──────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            console.log("[VideoDebug] Component Unmounting - Cleaning up all intervals.");
            clearPollingInterval();
            stopProgress(false);
            generatingRef.current = false;
        };
    }, [clearPollingInterval, stopProgress]);

    // ── Sync with lead prop ───────────────────────────────────────────────
    useEffect(() => {
        if (!lead || !open) return;

        const completedVideo = lead.generations?.find(
            (g: any) => g.type === "video" && g.status === "completed"
        );
        const pendingVideo = lead.generations?.find(
            (g: any) =>
                g.type === "video" &&
                ["pending", "processing", "processing_video", "processing_video_veo", "initializing"].includes(g.status)
        );

        console.log(`[VideoDebug] Syncing Lead State. Completed: ${!!completedVideo}, Pending: ${!!pendingVideo}`);

        clearPollingInterval();
        stopProgress(false);

        if (completedVideo) {
            console.log("[VideoDebug] Found completed video. Showing result.");
            setVideoGen(completedVideo);
            setGeneratingVideo(false);
            generatingRef.current = false;
        } else if (pendingVideo) {
            console.log(`[VideoDebug] Found pending video (ID: ${pendingVideo.id}). Resuming polling.`);
            setVideoGen(pendingVideo);
            setGeneratingVideo(true);
            generatingRef.current = true;
            startProgress();
            startPolling(pendingVideo.id);
        } else {
            setVideoGen(null);
            setGeneratingVideo(false);
            generatingRef.current = false;
        }
    }, [lead?.id, open]);

    if (!lead) return null;

    // ── Handlers ──────────────────────────────────────────────────────────

    const handleGenerateVideo = async () => {
        if (!lead.id) return;

        console.log("[VideoDebug] User clicked Generate Video.");
        setGeneratingVideo(true);
        generatingRef.current = true;
        setErrorMessage(null);
        startProgress();

        toast.info("Iniciando generación de vídeo...");

        try {
            const genRes = await fetch('/api/ai/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    scenario_id: selectedScenario === "automatic" ? null : selectedScenario,
                }),
            });
            const data = await genRes.json();

            if (!genRes.ok) throw new Error(data?.error || 'Video generation failed');

            console.log("[VideoDebug] Generate API Success. New Gen ID:", data.generation_id);
            const newVideoGen = { id: data.generation_id, status: "initializing" };
            setVideoGen(newVideoGen);
            startPolling(data.generation_id);
        } catch (error: any) {
            console.error("[VideoDebug] Generate API Failed:", error);
            stopProgress(false);
            setGeneratingVideo(false);
            generatingRef.current = false;
            toast.error("Error al iniciar generación: " + error.message);
        }
    };
    const handleSendVideo = async () => {
        if (!lead?.id || !videoGen?.output_path) return;

        setSendingVideo(true);
        toast.info("Enviando video por email...");

        try {
            const sendRes = await fetch('/api/email/send-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: lead.id,
                    videoPath: videoGen.output_path,
                }),
            });
            const data = await sendRes.json();

            if (!sendRes.ok) throw new Error(data?.error || 'Send video failed');
            if (data.success) {
                toast.success("¡Video enviado con éxito! 📧");
            } else {
                throw new Error(data.error || "Error al enviar");
            }
        } catch (error: any) {
            console.error("[VideoDebug] Send Video Failed:", error);
            toast.error("Error al enviar el video: " + error.message);
        } finally {
            setSendingVideo(false);
        }
    };

    // ... (El resto de handlers: handleMarkContacted, handleDeleteLead, handleWhatsApp se mantienen igual) ...
    const handleMarkContacted = async () => {
        if (!lead) return;
        setLoadingAction(true);
        try {
            const updateRes = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_lead_status',
                    data: { lead_id: lead.id, status: 'contacted' }
                })
            });
            const updateResult = await updateRes.json();
            if (!updateResult.success) throw new Error(updateResult.error);
            toast.success("Lead marcado como contactado");
            onLeadUpdated?.();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Error al actualizar estado");
            console.error(error);
        } finally {
            setLoadingAction(false);
        }
    };

    const handleSetStatus = async (status: string) => {
        if (!lead || lead.status === status) return;
        setSettingStatus(true);
        try {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_lead_status', data: { lead_id: lead.id, status } }),
            });
            const r = await res.json();
            if (!r.success) throw new Error(r.error);
            toast.success("Estado actualizado");
            onLeadUpdated?.();
        } catch {
            toast.error("Error al actualizar estado");
        } finally {
            setSettingStatus(false);
        }
    };

    const handleDeleteLead = async () => {
        if (!lead?.id) return;
        setDeleting(true);
        try {
            const result = await deleteLeadAction(lead.id);
            if (result.success) {
                toast.success("Lead eliminado correctamente");
                onLeadUpdated?.();
                onOpenChange(false);
            } else {
                toast.error(result.error || "Error al eliminar el lead");
            }
        } catch (error: any) {
            toast.error("Error crítico al eliminar");
            console.error(error);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleWhatsApp = () => {
        if (!lead.phone) return;
        const clean = lead.phone.replace(/\+/g, "").replace(/\s+/g, "").replace(/-/g, "");
        window.open(`https://wa.me/${clean}`, "_blank");
    };

    const handleResendPhoto = async () => {
        if (!lead?.email || !generation?.output_path) return;
        setSendingPhoto(true);
        toast.info("Enviando imagen por email...");
        try {
            const res = await fetch('/api/email/send-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: lead.email,
                    name: lead.name,
                    imageUrl: generation.output_path,
                    leadId: lead.id,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data?.error || 'Error al enviar');
            toast.success("¡Imagen enviada por email! 📧");
        } catch (error: any) {
            console.error("[ResendPhoto] Error:", error);
            toast.error("Error al enviar imagen: " + error.message);
        } finally {
            setSendingPhoto(false);
        }
    };


    const generation = lead.generations?.find(
        (g: any) => g.type === "image" && g.status === "completed"
    );

    const isVideoCompleted = videoGen?.status === "completed";
    const canGenerate = !generatingVideo && !isVideoCompleted && !!selectedScenario;

    // Display values for the split modal (desktop) and mobile info tab
    const leadInitials = (lead.name || "—").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const sd = lead.survey_data || {};
    const ageLabel = sd.ageRange || "—";
    const goalLabel = Q_GOAL[sd.improvementGoal] || sd.improvementGoal || "—";
    const timeLabel = Q_TIME[sd.timeframe] || sd.timeframe || "—";
    const sourceLabel = sd.source || sd.clinicPreference || "Web";
    // Respuestas a los campos adicionales del widget (leads.custom_data)
    const customAnswers: { label: string; value: string }[] = Object.values(
        (lead.custom_data && typeof lead.custom_data === "object" ? lead.custom_data : {}) as Record<string, { label: string; value: string }>
    ).filter((a) => a && a.label && a.value);
    const requestDate = new Date(lead.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    // ── Motion presets (respetan prefers-reduced-motion) ──────────────────
    const rise: Variants = reduceMotion
        ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
        : {
            hidden: { opacity: 0, y: 12 },
            show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { ...SPRING, delay: 0.06 + i * 0.06 } }),
        };
    const tabMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 } }
        : { initial: { opacity: 0, x: 14 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -14 }, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const } };
    const mediaMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 } }
        : { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.98 }, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } };
    const shimmer = reduceMotion ? undefined : "sf-shimmer 1.6s linear infinite";

    const mobileTabs = [
        { id: "info" as const, label: "Información", icon: User },
        { id: "video" as const, label: "Video", icon: MonitorPlay },
        { id: "gestion" as const, label: "Gestión", icon: Briefcase },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-full md:max-w-[1040px] w-full h-[100dvh] md:h-[620px] md:max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-none md:rounded-[24px] border-0 md:border md:border-[var(--blue-line)] bg-white shadow-[0_40px_90px_-30px_rgba(19,27,34,0.65)] [&>button]:hidden"
                onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}
            >
                <DialogTitle className="sr-only">{lead.name || "Detalle del lead"}</DialogTitle>
                <DialogDescription className="sr-only">Detalle, simulación y gestión del lead</DialogDescription>

                <motion.div
                    className="qoves-admin flex flex-col flex-1 min-h-0 h-full"
                    initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={reduceMotion ? { duration: 0 } : SPRING}
                >

                {/* ═══════════════════════════════════════════════════════ */}
                {/* ══  MOBILE LAYOUT  ═══════════════════════════════════ */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="md:hidden flex flex-col h-full bg-white">

                    {/* ── Mobile Hero: Image Preview (navy) ── */}
                    <div className="relative flex-none overflow-hidden" style={{ height: '42vh', background: NAVY_BG }}>
                        {/* Compact top bar overlay */}
                        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3 bg-gradient-to-b from-[rgba(19,27,34,0.82)] to-transparent">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                    onClick={() => onOpenChange(false)}
                                    aria-label="Cerrar"
                                    className="w-9 h-9 rounded-full bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
                                >
                                    <ChevronLeft className="w-5 h-5 text-white" />
                                </button>
                                <NavyAvatar initials={leadInitials} size={34} glass />
                                <div className="min-w-0">
                                    <p className="text-white text-sm font-semibold tracking-[-0.01em] truncate">{lead.name}</p>
                                    <p className="mono" style={{ fontSize: 8.5, color: "rgba(255,255,255,0.55)", letterSpacing: "0.16em" }}>{requestDate}</p>
                                </div>
                            </div>
                            <StatusPill status={lead.status} />
                        </div>

                        {/* Image/Video toggle pills */}
                        {isVideoCompleted && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex bg-white/10 backdrop-blur-md p-1 rounded-full border border-white/15">
                                {([["images", "Antes/Después"], ["video", "Video"]] as const).map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`relative px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${viewMode === mode ? "text-navy-2" : "text-white/75"}`}
                                    >
                                        {viewMode === mode && (
                                            <motion.span layoutId="lead-media-toggle" className="absolute inset-0 rounded-full bg-white shadow" transition={reduceMotion ? { duration: 0 } : SPRING} />
                                        )}
                                        <span className="relative">{label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Image content */}
                        <div className="w-full h-full flex items-center justify-center pt-12 pb-2">
                            <AnimatePresence mode="wait" initial={false}>
                                {viewMode === "images" ? (
                                    generation ? (
                                        <motion.div key="m-images" {...mediaMotion} className="relative w-full h-full flex items-center justify-center p-2">
                                            {generation.input_path && generation.input_path !== "unknown" ? (
                                                <div className="relative h-full w-auto aspect-[9/16] rounded-2xl overflow-hidden bg-navy-3 border border-white/10 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)]">
                                                    <BeforeAfterSlider
                                                        beforeImage={generation.input_path}
                                                        afterImage={generation.output_path}
                                                        className="w-full h-full"
                                                    />
                                                </div>
                                            ) : (
                                                <img
                                                    src={generation.output_path}
                                                    alt="Generated Smile"
                                                    className="w-full h-full object-contain rounded-2xl"
                                                />
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div key="m-empty" {...mediaMotion} className="text-center text-white/55">
                                            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl grid place-items-center bg-white/10 border border-white/15">
                                                <ImageIcon className="w-6 h-6" strokeWidth={1.5} />
                                            </div>
                                            <p className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>Sin imágenes</p>
                                        </motion.div>
                                    )
                                ) : isVideoCompleted ? (
                                    <motion.div key="m-video" {...mediaMotion} className="relative h-full w-auto aspect-[9/16] rounded-2xl overflow-hidden bg-navy-3 border border-white/10 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.8)]">
                                        <video
                                            key={videoGen.output_path}
                                            src={`/api/storage/generated/${videoGen.output_path}`}
                                            className="w-full h-full object-contain"
                                            controls
                                            autoPlay
                                            muted
                                            playsInline
                                            loop
                                        />
                                        <button
                                            className="absolute top-2 right-2 h-7 inline-flex items-center rounded-full bg-blue-deep hover:bg-blue-ink text-white text-[10px] font-semibold px-3 z-30 shadow-lg transition-colors disabled:opacity-60"
                                            onClick={handleSendVideo}
                                            disabled={sendingVideo}
                                        >
                                            {sendingVideo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                                            Enviar
                                        </button>
                                    </motion.div>
                                ) : null}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ── Quick Actions Bar ── */}
                    <div className="flex-none border-b border-blue-line bg-white px-3 py-3">
                        <div className="flex items-center gap-2">
                            <motion.button
                                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                                onClick={handleWhatsApp}
                                className="flex-1 min-w-0 h-10 flex items-center justify-center gap-2 rounded-full bg-blue-deep hover:bg-blue-ink text-white text-[13px] font-medium shadow-[0_10px_22px_-14px_rgba(79,107,127,0.95)] transition-colors"
                            >
                                <Share2 className="w-4 h-4 shrink-0" />
                                <span className="truncate">WhatsApp</span>
                            </motion.button>
                            <a
                                href={`tel:${lead.phone}`}
                                aria-label="Llamar"
                                className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-line bg-white text-blue-deep active:scale-95 transition-transform shrink-0"
                            >
                                <Phone className="w-4 h-4" />
                            </a>
                            {generation && (
                                <button
                                    onClick={handleResendPhoto}
                                    disabled={sendingPhoto}
                                    className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-line bg-blue-soft text-blue-deep active:scale-95 transition-transform disabled:opacity-50 shrink-0"
                                    title="Reenviar imagen por email"
                                >
                                    {sendingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                                </button>
                            )}
                            {isVideoCompleted && (
                                <button
                                    onClick={handleSendVideo}
                                    disabled={sendingVideo}
                                    className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-line bg-blue-soft text-blue-deep active:scale-95 transition-transform disabled:opacity-50 shrink-0"
                                    title="Reenviar video por email"
                                >
                                    {sendingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <MonitorPlay className="w-4 h-4" />}
                                </button>
                            )}
                            <a
                                href={`mailto:${lead.email}`}
                                className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-line bg-white text-blue-deep active:scale-95 transition-transform shrink-0"
                                title="Enviar email"
                            >
                                <Mail className="w-4 h-4" />
                            </a>
                            <button
                                onClick={handleMarkContacted}
                                disabled={loadingAction || lead.status === "contacted"}
                                className={`flex items-center justify-center w-10 h-10 rounded-full active:scale-95 transition-all shrink-0 border ${lead.status === "contacted"
                                    ? "bg-navy-2 border-navy-2 text-blue-light"
                                    : "bg-white border-blue-line text-ink-3 hover:text-blue-deep"
                                    }`}
                                title={lead.status === "contacted" ? "Ya contactado" : "Marcar contactado"}
                            >
                                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* ── Mobile Tab Bar ── */}
                    <div className="flex-none border-b border-blue-line bg-white">
                        <div className="flex">
                            {mobileTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setMobileTab(tab.id)}
                                    className={`relative flex-1 flex items-center justify-center gap-1.5 py-3 text-[12.5px] transition-colors ${mobileTab === tab.id
                                        ? "text-blue-deep font-semibold"
                                        : "text-ink-3 font-medium"
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                    {mobileTab === tab.id && (
                                        <motion.span
                                            layoutId="lead-tab-underline"
                                            className="absolute left-4 right-4 -bottom-px h-[2px] rounded-full bg-blue-deep"
                                            transition={reduceMotion ? { duration: 0 } : SPRING}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Mobile Tab Content ── */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,#f8fafb_0%,#eef3f6_100%)]">
                        <AnimatePresence mode="wait" initial={false}>

                        {/* ── Tab: Info ── */}
                        {mobileTab === "info" && (
                            <motion.div key="tab-info" {...tabMotion} className="p-4 space-y-5">
                                {/* Contact compact */}
                                <div className="card overflow-hidden">
                                    <a href={`mailto:${lead.email}`} className="flex items-center gap-3 p-3.5 active:bg-blue-tint transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-blue-tint border border-blue-line flex items-center justify-center text-blue-deep shrink-0">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="mono" style={{ fontSize: 8.5 }}>Email</p>
                                            <p className="text-sm font-medium text-ink truncate">{lead.email}</p>
                                        </div>
                                    </a>
                                    <a href={`tel:${lead.phone}`} className="flex items-center gap-3 p-3.5 border-t border-line active:bg-blue-tint transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-blue-tint border border-blue-line flex items-center justify-center text-blue-deep shrink-0">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="mono" style={{ fontSize: 8.5 }}>Teléfono</p>
                                            <p className="text-sm font-medium text-ink">{lead.phone}</p>
                                        </div>
                                    </a>
                                </div>

                                {/* Survey Data */}
                                {lead.survey_data && Object.keys(lead.survey_data).length > 0 && (
                                    <div className="space-y-2.5">
                                        <h3 className="mono px-1" style={{ fontSize: 9 }}>
                                            Cuestionario
                                        </h3>
                                        <div className="card overflow-hidden">
                                            <KVRow first label="Edad" value={lead.survey_data.ageRange} />
                                            <KVRow label="Objetivo" value={goalLabel} />
                                            <KVRow label="Plazo" value={timeLabel} />
                                            <KVRow label="Clínica" value={lead.survey_data.clinicPreference} />
                                        </div>
                                    </div>
                                )}

                                {customAnswers.length > 0 && (
                                    <div className="space-y-2.5">
                                        <h3 className="mono px-1" style={{ fontSize: 9 }}>Respuestas del formulario</h3>
                                        <div className="card overflow-hidden">
                                            {customAnswers.map((a, i) => (
                                                <div key={i} style={{ padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                                                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 3 }}>{a.label}</div>
                                                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── Tab: Video ── */}
                        {mobileTab === "video" && (
                            <motion.div key="tab-video" {...tabMotion} className="p-4 space-y-4">
                                {generation ? (
                                    <>
                                        {/* Scenario selector */}
                                        <div className="space-y-2.5">
                                            <h3 className="mono px-1" style={{ fontSize: 9 }}>
                                                Escenario
                                            </h3>
                                            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                                {scenarios.map((s) => (
                                                    <motion.button
                                                        key={s.id}
                                                        whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                                                        onClick={() => setSelectedScenario(s.id)}
                                                        disabled={generatingVideo || isVideoCompleted}
                                                        className={`flex flex-col items-center justify-center min-w-[66px] px-2 py-2.5 rounded-2xl border transition-colors shrink-0 ${selectedScenario === s.id
                                                            ? "bg-blue-tint border-blue-deep text-blue-deep shadow-[0_8px_18px_-12px_rgba(79,107,127,0.8)]"
                                                            : "bg-white border-blue-line text-ink-3"
                                                            } ${(generatingVideo || isVideoCompleted) ? "opacity-50" : ""}`}
                                                    >
                                                        <s.icon className="w-5 h-5 mb-1" />
                                                        <span className="text-[10px] font-semibold">{s.label}</span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Error Message */}
                                        <AnimatePresence>
                                            {errorMessage && (
                                                <motion.div
                                                    initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="p-3 rounded-2xl flex items-start gap-2 text-sm border border-[#ecd3cf] bg-[var(--danger-soft)] text-[#8f4f47]"
                                                >
                                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[var(--danger)]" />
                                                    <div>
                                                        <p className="font-semibold text-xs">Generación detenida</p>
                                                        <p className="opacity-90 text-[11px] mt-0.5">{errorMessage}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Generate / Progress button */}
                                        <button
                                            onClick={handleGenerateVideo}
                                            disabled={!canGenerate}
                                            className={`
                                                relative w-full h-12 rounded-full overflow-hidden font-medium text-sm
                                                transition-all duration-300 select-none
                                                ${isVideoCompleted
                                                    ? "bg-navy-2 text-white"
                                                    : canGenerate
                                                        ? "bg-blue-deep hover:bg-blue-ink text-white shadow-[0_12px_26px_-14px_rgba(79,107,127,0.95)] active:scale-[0.98]"
                                                        : generatingVideo
                                                            ? "bg-blue-ink text-white"
                                                            : "bg-blue-tint border border-blue-line text-ink-3"
                                                }
                                            `}
                                        >
                                            {generatingVideo && (
                                                <span
                                                    className="absolute inset-y-0 left-0 bg-white/15 transition-all duration-700 ease-linear"
                                                    style={{ width: `${videoProgress}%` }}
                                                />
                                            )}
                                            <span className="relative z-10 flex items-center justify-between px-5 h-full">
                                                {generatingVideo ? (
                                                    <>
                                                        <span className="flex items-center gap-2 min-w-0">
                                                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                                            <span className="truncate text-xs">{videoStage || "Iniciando..."}</span>
                                                        </span>
                                                        <span className="text-xs font-mono opacity-80 shrink-0 ml-2 tabular-nums">
                                                            {Math.round(videoProgress)}%
                                                        </span>
                                                    </>
                                                ) : isVideoCompleted ? (
                                                    <span className="flex items-center gap-2 w-full justify-center">
                                                        <CheckCircle2 className="w-4 h-4 text-blue-light" />
                                                        Vídeo Generado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 w-full justify-center">
                                                        <MonitorPlay className="w-4 h-4" />
                                                        Generar Vídeo Smile
                                                    </span>
                                                )}
                                            </span>
                                        </button>

                                        {/* Cancel */}
                                        {generatingVideo && (
                                            <button
                                                className="w-full h-9 inline-flex items-center justify-center rounded-full text-xs text-ink-3 hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
                                                onClick={handleCancelGeneration}
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                                Cancelar
                                            </button>
                                        )}

                                        {generatingVideo && (
                                            <div className="relative w-full h-1.5 bg-blue-soft rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-linear"
                                                    style={{
                                                        width: `${videoProgress}%`,
                                                        backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent), linear-gradient(90deg, var(--blue-deep), var(--blue-accent))",
                                                        backgroundSize: "200% 100%, 100% 100%",
                                                        animation: shimmer,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="empty-state">
                                        <div className="empty-ic"><MonitorPlay className="w-6 h-6" /></div>
                                        <p className="text-sm text-ink-2">No hay imágenes generadas para crear un video.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── Tab: Gestión ── */}
                        {mobileTab === "gestion" && (
                            <motion.div key="tab-gestion" {...tabMotion} className="p-4 space-y-3">
                                <button
                                    className="w-full h-12 px-5 inline-flex items-center gap-2.5 rounded-full border border-blue-line bg-white text-sm font-medium text-ink hover:border-blue-accent hover:text-blue-deep transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    onClick={handleMarkContacted}
                                    disabled={loadingAction || lead.status === "contacted"}
                                >
                                    {loadingAction ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : lead.status === "contacted" ? (
                                        <CheckCircle2 className="w-4 h-4 text-blue-deep" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    {lead.status === "contacted" ? "Ya contactado" : "Marcar como Contactado"}
                                </button>

                                <button className="w-full h-12 px-5 inline-flex items-center gap-2.5 rounded-full border border-blue-line bg-blue-tint text-sm font-medium text-ink-2 hover:text-blue-deep transition-colors">
                                    <Archive className="w-4 h-4" />
                                    Archivar Lead
                                </button>

                                <div className="h-px bg-blue-line my-2" />

                                <button
                                    className="w-full h-12 px-5 inline-flex items-center gap-2.5 rounded-full border border-[#ecd3cf] bg-[var(--danger-soft)] text-sm font-medium text-[#8f4f47] hover:bg-[var(--danger)] hover:text-white hover:border-[var(--danger)] transition-colors disabled:opacity-60"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={deleting}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Eliminar Lead
                                </button>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* ══  DESKTOP LAYOUT · media navy izq + rail de detalle  ═ */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="hidden md:grid" style={{ gridTemplateColumns: "420px 1fr", flex: 1, minHeight: 0 }}>
                    {/* ── media pane ── */}
                    <div style={{ position: "relative", background: NAVY_BG, padding: 20, display: "flex", flexDirection: "column", gap: 14, minHeight: 0, overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: "auto -30% -25% -30%", height: "45%", background: "radial-gradient(circle, rgba(150,190,215,0.14), transparent 65%)", pointerEvents: "none" }} />
                        <div style={{ position: "relative", flex: 1, borderRadius: 18, overflow: "hidden", minHeight: 0, display: "flex", background: "var(--navy-3)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 26px 50px -28px rgba(0,0,0,0.85)" }}>
                            <AnimatePresence mode="wait" initial={false}>
                                {viewMode === "video" && isVideoCompleted ? (
                                    <motion.div key="d-video" {...mediaMotion} style={{ width: "100%", height: "100%", display: "flex" }}>
                                        <video
                                            key={videoGen.output_path}
                                            src={`/api/storage/generated/${videoGen.output_path}`}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            controls autoPlay muted playsInline loop
                                        />
                                    </motion.div>
                                ) : generation ? (
                                    <motion.div key="d-images" {...mediaMotion} style={{ width: "100%", height: "100%", display: "flex" }}>
                                        {(generation.input_path && generation.input_path !== "unknown") ? (
                                            <BeforeAfterSlider beforeImage={generation.input_path} afterImage={generation.output_path} className="w-full h-full" />
                                        ) : (
                                            <img src={generation.output_path} alt="Sonrisa generada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div key="d-empty" {...mediaMotion} style={{ flex: 1, display: "grid", placeItems: "center", color: "rgba(255,255,255,0.7)" }}>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ width: 56, height: 56, margin: "0 auto 12px", borderRadius: 18, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                                                <ImageIcon size={24} strokeWidth={1.5} />
                                            </div>
                                            <p className="mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}>Sin imágenes generadas</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* video control card (frosted) */}
                        <motion.div
                            layout={!reduceMotion}
                            transition={SPRING}
                            style={{ position: "relative", background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderRadius: 18, padding: "14px 16px", boxShadow: "0 18px 40px -24px rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.6)" }}
                        >
                            {generatingVideo ? (
                                <>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <div className="mono" style={{ fontSize: 9, color: "var(--blue-deep)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{videoStage || "Generando vídeo…"}</div>
                                        <div className="mono" style={{ fontSize: 9, color: "var(--ink-2)", flexShrink: 0 }}>{Math.round(videoProgress)}%</div>
                                    </div>
                                    <div style={{ height: 6, background: "var(--blue-soft)", borderRadius: 99, overflow: "hidden" }}>
                                        <div
                                            style={{
                                                width: `${videoProgress}%`, height: "100%", borderRadius: 99, transition: "width .7s linear",
                                                backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent), linear-gradient(90deg, var(--blue-deep), var(--blue-accent))",
                                                backgroundSize: "200% 100%, 100% 100%",
                                                animation: shimmer,
                                            }}
                                        />
                                    </div>
                                    <button className="btn btn-ghost btn-sm" style={{ background: "#fff", width: "100%", marginTop: 12 }} onClick={handleCancelGeneration}>
                                        <XCircle size={15} /> Cancelar
                                    </button>
                                </>
                            ) : isVideoCompleted ? (
                                <>
                                    <div className="mono" style={{ fontSize: 9, marginBottom: 10, color: "var(--blue-deep)" }}>VÍDEO GENERADO</div>
                                    <div className="seg" style={{ display: "flex", width: "100%" }}>
                                        {([["images", "Antes/Después"], ["video", "Vídeo"]] as const).map(([mode, label]) => (
                                            <button key={mode} onClick={() => setViewMode(mode)} className={viewMode === mode ? "seg-on" : ""} style={{ flex: 1, position: "relative" }}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="btn btn-primary" style={{ width: "100%", marginTop: 12, height: 44, padding: "0 20px", fontSize: 14.5 }} onClick={handleSendVideo} disabled={sendingVideo}>
                                        {sendingVideo ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} Reenviar vídeo
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="mono" style={{ fontSize: 9, marginBottom: 10, color: "var(--blue-deep)" }}>VÍDEO · ESCENARIO POR EDAD</div>
                                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                                        {scenarios.map((sc) => {
                                            const Icon = sc.icon;
                                            return (
                                                <motion.button
                                                    key={sc.id}
                                                    whileTap={reduceMotion || !generation ? undefined : { scale: 0.95 }}
                                                    onClick={() => setSelectedScenario(sc.id)}
                                                    disabled={!generation}
                                                    className={"chip focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-soft" + (selectedScenario === sc.id ? " chip-on" : "")}
                                                    style={{ gap: 7, padding: "7px 11px", fontSize: 12.5, opacity: generation ? 1 : 0.55, cursor: generation ? "pointer" : "not-allowed" }}
                                                >
                                                    <Icon size={14} /> {sc.label}
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                    <AnimatePresence>
                                        {errorMessage && (
                                            <motion.div
                                                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ overflow: "hidden" }}
                                            >
                                                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, lineHeight: 1.45, color: "#8f4f47", background: "var(--danger-soft)", border: "1px solid #ecd3cf", borderRadius: 12, padding: "9px 11px", marginTop: 10 }}>
                                                    <AlertCircle size={14} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
                                                    {errorMessage}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <button className="btn btn-primary" style={{ width: "100%", marginTop: 12, height: 44, padding: "0 20px", fontSize: 14.5 }} onClick={handleGenerateVideo} disabled={!canGenerate}>
                                        <MonitorPlay size={16} /> Generar vídeo
                                    </button>
                                </>
                            )}
                        </motion.div>
                    </div>

                    {/* ── detail rail ── */}
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, background: "linear-gradient(180deg, #fff 0%, #f8fafb 100%)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "22px 24px 18px", borderBottom: "1px solid var(--blue-line)" }}>
                            <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                                <NavyAvatar initials={leadInitials} size={48} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</div>
                                    <div className="mono" style={{ fontSize: 9, marginTop: 4 }}>SOLICITUD · {requestDate}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.span
                                        key={lead.status}
                                        initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.18 }}
                                        style={{ display: "inline-flex" }}
                                    >
                                        <StatusPill status={lead.status} />
                                    </motion.span>
                                </AnimatePresence>
                                <button onClick={() => onOpenChange(false)} className="icon-btn" aria-label="Cerrar">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                                </button>
                            </div>
                        </div>

                        <motion.div
                            initial="hidden"
                            animate="show"
                            style={{ padding: "18px 24px 20px", overflowY: "auto", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 20 }}
                        >
                            <motion.div variants={rise} custom={0}>
                                <div className="mono" style={{ fontSize: 9, marginBottom: 4 }}>CONTACTO</div>
                                <DContactRow icon={<Mail size={17} />} label="CORREO ELECTRÓNICO" value={lead.email || "—"} />
                                <DContactRow icon={<Phone size={17} />} label="TELÉFONO" value={lead.phone || "—"} />
                            </motion.div>
                            <motion.div variants={rise} custom={1}>
                                <div className="mono" style={{ fontSize: 9, marginBottom: 10 }}>DATOS DE LA SIMULACIÓN</div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                    {[["Rango edad", ageLabel], ["Objetivo", goalLabel], ["Plazo", timeLabel], ["Origen", sourceLabel]].map(([k, v], i) => (
                                        <div key={i} style={{ background: "var(--blue-tint)", border: "1px solid var(--blue-line)", borderRadius: 14, padding: "10px 13px", minWidth: 0 }}>
                                            <div className="mono" style={{ fontSize: 8.5, marginBottom: 4 }}>{k.toUpperCase()}</div>
                                            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                            {customAnswers.length > 0 && (
                                <motion.div variants={rise} custom={2}>
                                    <div className="mono" style={{ fontSize: 9, marginBottom: 10 }}>RESPUESTAS DEL FORMULARIO</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {customAnswers.map((a, i) => (
                                            <div key={i} style={{ background: "#fff", border: "1px solid var(--blue-line)", borderRadius: 14, padding: "10px 13px" }}>
                                                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 3 }}>{a.label}</div>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            <motion.div variants={rise} custom={3}>
                                <div className="mono" style={{ fontSize: 9, marginBottom: 10 }}>CAMBIAR ESTADO</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                    {STATUS_CHOICES.map((k) => (
                                        <StatusChoice key={k} status={k} active={lead.status === k} disabled={settingStatus} onClick={() => handleSetStatus(k)} />
                                    ))}
                                    {settingStatus && <Loader2 className="animate-spin" size={15} style={{ color: "var(--blue-deep)" }} />}
                                </div>
                            </motion.div>
                        </motion.div>

                        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--blue-line)", display: "flex", gap: 10, background: "#fff" }}>
                            <button className="btn btn-primary" style={{ flex: 1, padding: "14px 24px", fontSize: 15 }} onClick={handleWhatsApp}><Share2 size={17} /> Contactar por WhatsApp</button>
                            {generation && (
                                <button className="btn btn-ghost" style={{ background: "#fff", width: 50, padding: 0 }} title="Reenviar imagen" aria-label="Reenviar imagen" onClick={handleResendPhoto} disabled={sendingPhoto}>
                                    {sendingPhoto ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                </motion.div>

                {/* Delete Confirmation Dialog (shared) */}
                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <DialogContent className="max-w-[90vw] sm:max-w-md rounded-[22px] border-[var(--blue-line)] p-0 overflow-hidden shadow-[0_40px_80px_-30px_rgba(19,27,34,0.6)]">
                        <div className="qoves-admin" style={{ padding: 24 }}>
                            <DialogHeader>
                                <div className="mx-auto sm:mx-0" style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--danger-soft)", color: "var(--danger)", marginBottom: 6 }}>
                                    <Trash2 size={20} />
                                </div>
                                <DialogTitle style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>¿Estás completamente seguro?</DialogTitle>
                                <DialogDescription style={{ color: "var(--ink-2)" }}>
                                    Esta acción no se puede deshacer.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-end gap-2.5 mt-6">
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-sm"
                                    style={{ background: "var(--danger)", color: "#fff", boxShadow: "0 10px 22px -14px rgba(181,103,94,0.95)", opacity: deleting ? 0.7 : 1 }}
                                    onClick={handleDeleteLead}
                                    disabled={deleting}
                                >
                                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            </DialogContent>
        </Dialog>
    );
}
