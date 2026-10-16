'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { setClinicPlan, grantClinicCredits, setClinicStatus } from '@/lib/platform/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

    return (
        <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={savePlan} disabled={savingPlan}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <form onSubmit={grant} className="space-y-2">
                <Label>Ajustar créditos (+ otorga / − descuenta)</Label>
                <div className="flex gap-2">
                    <Input type="number" placeholder="±100" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-28" />
                    <Input placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
                    <Button type="submit" disabled={granting}>{granting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}</Button>
                </div>
            </form>
            <div className="space-y-2">
                <Label>Estado de la clínica</Label>
                <div>
                    <Button variant={status === 'active' ? 'destructive' : 'default'} size="sm" onClick={toggleStatus} disabled={togglingStatus}>
                        {togglingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : status === 'active' ? 'Suspender' : 'Activar'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Suspender bloquea las generaciones de esta clínica.</p>
                </div>
            </div>
        </div>
    );
}
