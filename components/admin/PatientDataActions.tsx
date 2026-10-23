"use client";

/**
 * Derechos del paciente desde el panel (solo owner/admin):
 * - Exportar sus datos (acceso/portabilidad) → descarga un JSON.
 * - Eliminarlo con todos sus datos (supresión) → confirmación escribiendo ELIMINAR.
 */
import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { deleteLeadAction } from "@/app/(admin)/administracion/leads/actions";

const CONFIRM_WORD = "ELIMINAR";

function fileSlug(name: string | null | undefined) {
    const s = String(name || "paciente")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    return s || "paciente";
}

/** Descarga un JSON con todos los datos del paciente. Devuelve true si fue bien. */
export async function downloadPatientExport(lead: { id: string; name?: string | null }): Promise<boolean> {
    try {
        const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "export_lead_data", lead_id: lead.id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.data) {
            toast.error(json?.error || "No se pudieron exportar los datos.");
            return false;
        }
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `datos_${fileSlug(lead.name)}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Datos del paciente exportados");
        return true;
    } catch {
        toast.error("No se pudieron exportar los datos.");
        return false;
    }
}

interface ErasePatientDialogProps {
    lead: { id: string; name?: string | null } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onErased?: () => void;
}

/** Confirmación fuerte (escribir ELIMINAR) antes de borrar al paciente y todos sus datos. */
export function ErasePatientDialog({ lead, open, onOpenChange, onErased }: ErasePatientDialogProps) {
    const [typed, setTyped] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) setTyped("");
    }, [open]);

    const ready = typed.trim().toUpperCase() === CONFIRM_WORD;

    const erase = async () => {
        if (!lead?.id || !ready) return;
        setBusy(true);
        try {
            const result = await deleteLeadAction(lead.id);
            if (result.success) {
                toast.success("Paciente y datos eliminados definitivamente");
                onOpenChange(false);
                onErased?.();
            } else {
                toast.error(result.error || "No se pudo eliminar al paciente");
            }
        } catch {
            toast.error("No se pudo eliminar al paciente");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
            <DialogContent className="sf-dialog w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] sm:max-w-md rounded-[22px] border-[var(--blue-line)] p-0 overflow-hidden shadow-[0_40px_80px_-30px_rgba(19,27,34,0.6)]">
                <div className="qoves-admin sf-touch" style={{ padding: 24 }}>
                    <DialogHeader>
                        <div className="mx-auto sm:mx-0" style={{ width: 44, height: 44, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--danger-soft)", color: "var(--danger)", marginBottom: 6 }}>
                            <Trash2 size={20} />
                        </div>
                        <DialogTitle style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: 1.25, paddingRight: 36 }}>
                            ¿Eliminar a {lead?.name || "este paciente"} y todos sus datos?
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div style={{ color: "var(--ink-2)", lineHeight: 1.5, fontSize: 14 }}>
                                <p style={{ margin: 0 }}>
                                    Se borrarán de forma permanente su ficha, sus respuestas, sus consentimientos, sus fotos, simulaciones y vídeos. No se puede deshacer.
                                </p>
                                <p style={{ margin: "8px 0 0" }}>
                                    Si el paciente te pidió una copia, exporta sus datos antes de eliminarlo.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <label htmlFor="erase-confirm" style={{ display: "block", fontSize: 13, color: "var(--ink-2)", marginTop: 18, marginBottom: 6 }}>
                        Escribe <strong style={{ color: "var(--ink)", letterSpacing: "0.04em" }}>{CONFIRM_WORD}</strong> para confirmar
                    </label>
                    <input
                        id="erase-confirm"
                        className="field"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        disabled={busy}
                        style={{ height: 44, fontSize: 15, width: "100%" }}
                        onKeyDown={(e) => { if (e.key === "Enter" && ready) void erase(); }}
                    />
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6 [&>button]:w-full sm:[&>button]:w-auto">
                        <button className="btn btn-ghost btn-sm" onClick={() => onOpenChange(false)} disabled={busy}>
                            Cancelar
                        </button>
                        <button
                            className="btn btn-sm"
                            style={{ background: "var(--danger)", color: "#fff", boxShadow: "0 10px 22px -14px rgba(181,103,94,0.95)", opacity: busy || !ready ? 0.55 : 1 }}
                            onClick={erase}
                            disabled={busy || !ready}
                        >
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                            Eliminar definitivamente
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
