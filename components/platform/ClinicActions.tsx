'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { setClinicPlan, grantClinicCredits, setClinicStatus } from '@/lib/platform/queries';

const PLANS = ['free', 'starter', 'pro', 'enterprise'];

export function ClinicActions({ clinicId, currentPlan, status }: { clinicId: string; currentPlan: string; status: string }) {
    const router = useRouter();
    const [plan, setPlan] = useState(currentPlan);
    const [savingPlan, setSavingPlan] = useState(false);
    const [delta, setDelta] = useState('');
    const [reason, setReason] = useState('');
    const [granting, setGranting] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    async function toggleStatus() {
        const nextStatus = status === 'active' ? 'suspended' : 'active';
        setTogglingStatus(true);
        const res = await setClinicStatus(clinicId, nextStatus);
        setTogglingStatus(false);
        if (!res.ok) return toast.error(res.error || 'Error');
        toast.success(nextStatus === 'suspended' ? 'Clínica suspendida' : 'Clínica activada');
        router.refresh();
    }

    async function savePlan(value: string) {
        setPlan(value); setSavingPlan(true);
        const res = await setClinicPlan(clinicId, value);
        setSavingPlan(false);
        if (!res.ok) return toast.error(res.error || 'Error');
        toast.success('Plan actualizado'); router.refresh();
    }

    async function grant(e: React.FormEvent) {
        e.preventDefault();
        const n = parseInt(delta, 10);
        if (!Number.isInteger(n) || n === 0) return toast.error('Ingresa un número (+/-) distinto de 0');
        setGranting(true);
        const res = await grantClinicCredits(clinicId, n, reason);
        setGranting(false);
        if (!res.ok) return toast.error(res.error || 'Error');
        toast.success(`Saldo nuevo: ${res.balanceAfter}`); setDelta(''); setReason(''); router.refresh();
    }

    const block = { padding: 18, borderRadius: 16, border: '1px solid var(--line)', background: '#fff', display: 'flex', flexDirection: 'column' as const, gap: 10 };
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div style={block}>
                <span className="mono" style={{ fontSize: 9 }}>PLAN</span>
                <div className="seg seg-tabs" role="radiogroup" aria-label="Plan de la clínica">
                    {PLANS.map((p) => (
                        <button key={p} type="button" role="radio" aria-checked={plan === p} className={plan === p ? 'seg-on' : ''} disabled={savingPlan} onClick={() => plan !== p && savePlan(p)}>
                            {p}
                        </button>
                    ))}
                </div>
                {savingPlan && <span style={{ fontSize: 12.5, color: 'var(--ink-3)', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Loader2 className="animate-spin" size={13} /> Guardando…</span>}
            </div>

            <form onSubmit={grant} style={block}>
                <span className="mono" style={{ fontSize: 9 }}>AJUSTAR CRÉDITOS · + OTORGA / − DESCUENTA</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input className="field" type="number" placeholder="±100" value={delta} onChange={(e) => setDelta(e.target.value)} style={{ width: 96, height: 42 }} aria-label="Créditos" />
                    <input className="field" placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} style={{ flex: '1 1 120px', height: 42 }} aria-label="Motivo" />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={granting} style={{ height: 42 }}>
                        {granting ? <Loader2 className="animate-spin" size={15} /> : 'Aplicar'}
                    </button>
                </div>
            </form>

            <div style={{ ...block, borderColor: status === 'active' ? '#ecd3cf' : 'var(--blue-line)', background: status === 'active' ? 'linear-gradient(180deg, #fff, var(--danger-soft))' : 'var(--blue-tint)' }}>
                <span className="mono" style={{ fontSize: 9 }}>ESTADO DE LA CLÍNICA</span>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, lineHeight: 1.5 }}>Suspender bloquea las generaciones de esta clínica.</p>
                <button
                    className="btn btn-sm"
                    onClick={toggleStatus}
                    disabled={togglingStatus}
                    style={{ alignSelf: 'flex-start', background: status === 'active' ? 'var(--danger)' : 'var(--blue-deep)', color: '#fff', border: 'none' }}
                >
                    {togglingStatus ? <Loader2 className="animate-spin" size={15} /> : status === 'active' ? 'Suspender clínica' : 'Activar clínica'}
                </button>
            </div>
        </div>
    );
}
