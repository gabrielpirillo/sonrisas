'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { setClinicPlan, grantClinicCredits, setClinicStatus } from '@/lib/platform/queries';
import { PLANS, planLabel } from '@/components/platform/labels';

export function ClinicActions({ clinicId, currentPlan, status }: { clinicId: string; currentPlan: string; status: string }) {
    const router = useRouter();
    const [plan, setPlan] = useState(currentPlan);
    const [savingPlan, setSavingPlan] = useState(false);
    const [delta, setDelta] = useState('');
    const [reason, setReason] = useState('');
    const [granting, setGranting] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const active = status === 'active';

    async function toggleStatus() {
        const nextStatus = active ? 'suspended' : 'active';
        if (nextStatus === 'suspended' && !confirm('¿Suspender esta clínica? No podrá generar simulaciones hasta que la actives de nuevo.')) return;
        setTogglingStatus(true);
        const res = await setClinicStatus(clinicId, nextStatus);
        setTogglingStatus(false);
        if (!res.ok) return toast.error(res.error || 'No se pudo cambiar el estado');
        toast.success(nextStatus === 'suspended' ? 'Clínica suspendida' : 'Clínica activada');
        router.refresh();
    }

    async function savePlan(value: string) {
        const prev = plan;
        setPlan(value); setSavingPlan(true);
        const res = await setClinicPlan(clinicId, value);
        setSavingPlan(false);
        if (!res.ok) { setPlan(prev); return toast.error(res.error || 'No se pudo cambiar el plan'); }
        toast.success(`Plan actualizado a ${planLabel(value)}`); router.refresh();
    }

    async function grant(e: React.FormEvent) {
        e.preventDefault();
        const n = parseInt(delta, 10);
        if (!Number.isInteger(n) || n === 0) return toast.error('Ingresa un número (+/−) distinto de 0');
        setGranting(true);
        const res = await grantClinicCredits(clinicId, n, reason);
        setGranting(false);
        if (!res.ok) return toast.error(res.error || 'No se pudo ajustar el saldo');
        toast.success(`Saldo nuevo: ${res.balanceAfter}`); setDelta(''); setReason(''); router.refresh();
    }

    return (
        <div className="sa-actions">
            <div className="sa-block">
                <span className="mono" id="sa-plan-label">PLAN</span>
                <div className="seg seg-tabs sa-plan-seg" role="radiogroup" aria-labelledby="sa-plan-label" aria-busy={savingPlan || undefined}>
                    {PLANS.map((p) => (
                        <button key={p} type="button" role="radio" aria-checked={plan === p} className={plan === p ? 'seg-on' : ''} disabled={savingPlan} onClick={() => plan !== p && savePlan(p)}>
                            {planLabel(p)}
                        </button>
                    ))}
                </div>
                {savingPlan && <span className="sa-saving" role="status"><Loader2 className="animate-spin" size={13} aria-hidden /> Guardando…</span>}
            </div>

            <form onSubmit={grant} className="sa-block">
                <span className="mono">AJUSTAR CRÉDITOS</span>
                <p id="sa-grant-hint">Un número positivo otorga créditos; uno negativo (−) los descuenta.</p>
                <div className="sa-grant">
                    <input
                        className="field sa-grant-delta"
                        type="number"
                        step={1}
                        placeholder="±100"
                        value={delta}
                        onChange={(e) => setDelta(e.target.value)}
                        aria-label="Créditos a sumar o restar"
                        aria-describedby="sa-grant-hint"
                        enterKeyHint="next"
                    />
                    <input
                        className="field sa-grant-reason"
                        placeholder="Motivo"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        aria-label="Motivo"
                        enterKeyHint="done"
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={granting}>
                        {granting ? <Loader2 className="animate-spin" size={15} aria-hidden /> : 'Aplicar'}
                    </button>
                </div>
            </form>

            <div className={`sa-block ${active ? 'sa-block-danger' : 'sa-block-calm'}`}>
                <span className="mono">ESTADO DE LA CLÍNICA</span>
                <p>
                    {active
                        ? 'Suspender bloquea las generaciones de esta clínica.'
                        : status === 'suspended'
                            ? 'Clínica suspendida: no puede generar simulaciones.'
                            : 'Activar la clínica habilita sus generaciones.'}
                </p>
                <button
                    type="button"
                    className={`btn btn-sm sa-status-btn ${active ? 'sa-status-btn-danger' : 'sa-status-btn-ok'}`}
                    onClick={toggleStatus}
                    disabled={togglingStatus}
                >
                    {togglingStatus ? <Loader2 className="animate-spin" size={15} aria-hidden /> : active ? 'Suspender clínica' : 'Activar clínica'}
                </button>
            </div>
        </div>
    );
}
