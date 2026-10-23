"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileCheck2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { acceptCurrentLegalAction, getLegalStatusAction } from "@/lib/legal/actions";

/**
 * Aviso no bloqueante para owner/admin cuando la clínica activa no ha aceptado
 * las versiones vigentes de los términos y del contrato de encargo. Desaparece
 * al aceptar (queda registrado en el servidor). "Cerrar" solo lo oculta en esta
 * visita: vuelve a aparecer hasta que se acepte.
 */
export function LegalAcceptanceBanner({ clinicKey }: { clinicKey: string | null }) {
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getLegalStatusAction()
            .then((s) => { if (!cancelled) setShow(s.needsAcceptance); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [clinicKey]);

    if (!show) return null;

    async function accept() {
        setSaving(true);
        const res = await acceptCurrentLegalAction().catch(() => ({ ok: false, error: "No se pudo guardar. Inténtalo de nuevo." }));
        setSaving(false);
        if (res.ok) {
            setShow(false);
            toast.success("Gracias. Aceptación registrada.");
        } else {
            toast.error(res.error || "No se pudo guardar. Inténtalo de nuevo.");
        }
    }

    return (
        <div className="sf-legal-banner" role="region" aria-label="Actualización de términos">
            <FileCheck2 size={18} strokeWidth={1.8} aria-hidden className="ic" />
            <p>
                <strong>Actualizamos nuestros términos y el contrato de encargo: revisa y acepta.</strong>{" "}
                <span>
                    Lee los <Link href="/terminos" target="_blank">Términos</Link>, el{" "}
                    <Link href="/encargo-de-tratamiento" target="_blank">Contrato de encargo de tratamiento</Link> y la{" "}
                    <Link href="/privacidad" target="_blank">Política de privacidad</Link>.
                </span>
            </p>
            <div className="act">
                <button type="button" className="ok" onClick={accept} disabled={saving} aria-busy={saving || undefined}>
                    {saving ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null} Aceptar
                </button>
                <button type="button" className="close" onClick={() => setShow(false)} aria-label="Ocultar por ahora">
                    <X size={16} aria-hidden />
                </button>
            </div>
        </div>
    );
}
