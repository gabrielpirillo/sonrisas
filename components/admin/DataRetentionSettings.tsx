"use client";

/**
 * Configuración › Privacidad: plazos de conservación (owner/admin) y baja de
 * la clínica con todos sus datos (solo owner, 30 días para cancelar).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { RETENTION_LIMITS, CLINIC_DELETION_GRACE_DAYS, UPLOAD_TTL_HOURS } from "@/lib/retentionLimits";

const PHOTO_OPTIONS = [30, 60, 90, 180, 365];
const LEAD_OPTIONS = [180, 365, 730, 1095, 1825];

function daysLabel(d: number) {
    if (d % 365 === 0) {
        const y = d / 365;
        return `${y} ${y === 1 ? "año" : "años"} (${d} días)`;
    }
    if (d >= 30 && d % 30 === 0) {
        const m = d / 30;
        return `${m} ${m === 1 ? "mes" : "meses"} (${d} días)`;
    }
    return `${d} días`;
}

/** Opciones fijas + el valor actual si es uno personalizado. */
function optionsWith(base: number[], current: number) {
    return base.includes(current) ? base : [...base, current].sort((a, b) => a - b);
}

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

async function postAdmin(body: Record<string, unknown>) {
    const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) throw new Error(json?.error || "No se pudo completar la acción.");
    return json;
}

interface Props {
    clinicName: string;
    photosDays: number;
    leadsDays: number;
    isOwner: boolean;
    deletionScheduledFor: string | null;
}

export function DataRetentionSettings({ clinicName, photosDays, leadsDays, isOwner, deletionScheduledFor }: Props) {
    const router = useRouter();
    const [photos, setPhotos] = useState(photosDays);
    const [leads, setLeads] = useState(leadsDays);
    const [saved, setSaved] = useState({ photos: photosDays, leads: leadsDays });
    const [saving, setSaving] = useState(false);

    const [scheduled, setScheduled] = useState<string | null>(deletionScheduledFor);
    const [askDelete, setAskDelete] = useState(false);
    const [typedName, setTypedName] = useState("");
    const [busy, setBusy] = useState(false);

    const dirty = photos !== saved.photos || leads !== saved.leads;

    const save = async () => {
        setSaving(true);
        try {
            await postAdmin({ action: "update_retention_settings", photos_days: photos, leads_days: leads });
            setSaved({ photos, leads });
            toast.success("Plazos de conservación guardados");
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const requestDeletion = async () => {
        setBusy(true);
        try {
            const json = await postAdmin({ action: "request_clinic_deletion", confirm_name: typedName });
            setScheduled(json.deletion_scheduled_for ?? null);
            setAskDelete(false);
            setTypedName("");
            toast.success("Baja solicitada. Puedes cancelarla durante 30 días.");
            router.refresh();
            // El banner del panel se actualiza con /api/me al navegar.
            window.dispatchEvent(new Event("sf:clinic-deletion-changed"));
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const cancelDeletion = async () => {
        setBusy(true);
        try {
            await postAdmin({ action: "cancel_clinic_deletion" });
            setScheduled(null);
            toast.success("Baja cancelada. La clínica sigue activa.");
            router.refresh();
            window.dispatchEvent(new Event("sf:clinic-deletion-changed"));
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const nameMatches = typedName.trim() === clinicName.trim() && clinicName.trim() !== "";

    return (
        <>
            {/* ── Plazos de conservación ── */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--blue-soft)", color: "var(--blue-deep)", flexShrink: 0 }}>
                        <ShieldCheck size={18} />
                    </span>
                    <div>
                        <span className="mono" style={{ fontSize: 9, color: "var(--blue-deep)" }}>PRIVACIDAD</span>
                        <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", margin: "3px 0 0" }}>Conservación <span style={{ color: "var(--ink-3)" }}>de datos de pacientes</span></h3>
                    </div>
                </div>
                <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
                        Guardamos los datos solo el tiempo necesario. Pasado cada plazo se borran solos, de forma definitiva. La selfie original se borra siempre a las {UPLOAD_TTL_HOURS} horas.
                    </p>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Simulaciones (fotos y vídeos generados)</span>
                        <select className="field" value={photos} onChange={(e) => setPhotos(Number(e.target.value))} style={{ height: 44 }} disabled={saving}>
                            {optionsWith(PHOTO_OPTIONS, photos).map((d) => <option key={d} value={d}>{daysLabel(d)}</option>)}
                        </select>
                        <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                            Entre {RETENTION_LIMITS.photos.min} y {RETENTION_LIMITS.photos.max} días. La ficha del paciente se mantiene; solo se borran las imágenes y vídeos.
                        </span>
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Ficha completa del paciente</span>
                        <select className="field" value={leads} onChange={(e) => setLeads(Number(e.target.value))} style={{ height: 44 }} disabled={saving}>
                            {optionsWith(LEAD_OPTIONS, leads).map((d) => <option key={d} value={d}>{daysLabel(d)}</option>)}
                        </select>
                        <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                            Entre 6 meses y 5 años. Al vencer se borran sus datos de contacto, respuestas, consentimientos y archivos.
                        </span>
                    </label>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving}>
                            {saving && <Loader2 size={15} className="animate-spin" />}
                            Guardar plazos
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Baja de la clínica ── */}
            <div id="baja-clinica" className="card" style={{ padding: "20px 22px 22px", borderColor: scheduled ? "var(--danger)" : undefined, scrollMarginTop: 80 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--danger-soft)", color: "var(--danger)", flexShrink: 0 }}>
                        {scheduled ? <AlertTriangle size={18} /> : <Trash2 size={18} />}
                    </span>
                    <div>
                        <span className="mono" style={{ fontSize: 9, color: "var(--danger)" }}>ZONA DE PELIGRO</span>
                        <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", margin: "3px 0 0" }}>Eliminar la clínica y todos sus datos</h3>
                    </div>
                </div>

                {scheduled ? (
                    <>
                        <p style={{ margin: "0 0 14px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
                            La baja está programada. El <strong style={{ color: "var(--ink)" }}>{fmtDate(scheduled)}</strong> se borrarán de forma definitiva todos los pacientes, simulaciones, archivos, el equipo y la configuración de la clínica.
                        </p>
                        {isOwner ? (
                            <button type="button" className="btn btn-white btn-sm" onClick={cancelDeletion} disabled={busy}>
                                {busy && <Loader2 size={15} className="animate-spin" />}
                                Cancelar la baja
                            </button>
                        ) : (
                            <p className="mono" style={{ fontSize: 9.5, margin: 0 }}>Solo el propietario puede cancelar la baja</p>
                        )}
                    </>
                ) : (
                    <>
                        <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}>
                            Se borrarán todos los pacientes, simulaciones, vídeos, logos, el equipo y la configuración. Tendrás {CLINIC_DELETION_GRACE_DAYS} días para arrepentirte; después, el borrado es definitivo.
                        </p>
                        <p style={{ margin: "0 0 14px", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-3)" }}>
                            Por obligación contable conservamos el registro de tus compras de créditos (importe, fecha y nombre de la clínica), sin datos de pacientes.
                        </p>
                        {isOwner ? (
                            <button
                                type="button"
                                className="btn btn-sm"
                                style={{ background: "var(--danger-soft)", color: "#8f4f47", border: "1px solid #ecd3cf" }}
                                onClick={() => setAskDelete(true)}
                            >
                                <Trash2 size={15} />
                                Eliminar la clínica…
                            </button>
                        ) : (
                            <p className="mono" style={{ fontSize: 9.5, margin: 0 }}>Solo el propietario de la clínica puede solicitar la baja</p>
                        )}
                    </>
                )}
            </div>

            <Dialog open={askDelete} onOpenChange={(o) => { if (!busy) { setAskDelete(o); if (!o) setTypedName(""); } }}>
                <DialogContent className="sf-dialog w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] sm:max-w-md rounded-[22px] border-[var(--blue-line)] p-0 overflow-hidden shadow-[0_40px_80px_-30px_rgba(19,27,34,0.6)]">
                    <div className="qoves-admin sf-touch" style={{ padding: 24 }}>
                        <DialogHeader>
                            <DialogTitle style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1.25, paddingRight: 36 }}>
                                ¿Eliminar {clinicName} y todos sus datos?
                            </DialogTitle>
                            <DialogDescription style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>
                                La clínica seguirá funcionando {CLINIC_DELETION_GRACE_DAYS} días y podrás cancelar la baja en ese plazo. Después se borrará todo de forma definitiva.
                            </DialogDescription>
                        </DialogHeader>
                        <label htmlFor="clinic-delete-confirm" style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginTop: 18, marginBottom: 6 }}>
                            Escribe el nombre de la clínica para confirmar: <strong style={{ color: "var(--ink)" }}>{clinicName}</strong>
                        </label>
                        <input
                            id="clinic-delete-confirm"
                            className="field"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            disabled={busy}
                            style={{ height: 44, fontSize: 15, width: "100%" }}
                        />
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6 [&>button]:w-full sm:[&>button]:w-auto">
                            <button className="btn btn-ghost btn-sm" onClick={() => { setAskDelete(false); setTypedName(""); }} disabled={busy}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-sm"
                                style={{ background: "var(--danger)", color: "#fff", opacity: busy || !nameMatches ? 0.55 : 1 }}
                                onClick={requestDeletion}
                                disabled={busy || !nameMatches}
                            >
                                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                                Programar la baja
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
