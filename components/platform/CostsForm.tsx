'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { setCreditCost } from '@/lib/platform/queries';

type Action = 'image' | 'video';
const ACTIONS: Array<{ key: Action; label: string; aria: string }> = [
    { key: 'image', label: 'CRÉDITOS POR IMAGEN', aria: 'Créditos por imagen' },
    { key: 'video', label: 'CRÉDITOS POR VÍDEO', aria: 'Créditos por vídeo' },
];

export function CostsForm({ costs }: { costs: Array<{ action: string; credits: number }> }) {
    const router = useRouter();
    const initial: Record<string, number> = {};
    costs.forEach((c) => (initial[c.action] = c.credits));
    const [base, setBase] = useState<Record<Action, number>>({ image: initial.image ?? 1, video: initial.video ?? 4 });
    // Texto del campo (permite vaciarlo mientras se escribe, sin saltar a 0).
    const [vals, setVals] = useState<Record<Action, string>>({ image: String(base.image), video: String(base.video) });
    const [saving, setSaving] = useState<Action | null>(null);

    const parse = (a: Action) => {
        const t = vals[a].trim();
        if (!/^\d+$/.test(t)) return null;
        const n = Number(t);
        return n <= 10000 ? n : null;
    };

    async function save(e: React.FormEvent, a: Action) {
        e.preventDefault();
        const n = parse(a);
        if (n === null) return toast.error('Ingresa un número entero de 0 en adelante.');
        setSaving(a);
        const res = await setCreditCost(a, n);
        setSaving(null);
        if (!res.ok) return toast.error(res.error || 'No se pudo guardar el costo');
        setBase((b) => ({ ...b, [a]: n }));
        setVals((v) => ({ ...v, [a]: String(n) }));
        toast.success('Costo actualizado');
        router.refresh();
    }

    return (
        <div className="sa-costs">
            {ACTIONS.map(({ key: a, label, aria }) => {
                const n = parse(a);
                const dirty = n !== base[a];
                const invalid = n === null;
                const busy = saving === a;
                return (
                    <form key={a} className="sa-cost" onSubmit={(e) => save(e, a)} noValidate>
                        <label className="mono" htmlFor={`cost-${a}`} style={{ fontSize: 9 }}>{label}</label>
                        <div className="sa-cost-row">
                            <div className="sa-cost-in">
                                <input
                                    id={`cost-${a}`}
                                    className="field"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="off"
                                    value={vals[a]}
                                    onChange={(e) => setVals((v) => ({ ...v, [a]: e.target.value.replace(/[^\d]/g, '').slice(0, 5) }))}
                                    aria-label={aria}
                                    aria-invalid={invalid || undefined}
                                />
                                <span aria-hidden>{n === 1 ? 'crédito' : 'créditos'}</span>
                            </div>
                            <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !dirty || invalid}>
                                {busy ? <Loader2 className="animate-spin" size={15} aria-hidden /> : null}
                                Guardar
                            </button>
                        </div>
                        <span className="sa-cost-hint" aria-live="polite">
                            {invalid ? 'Ingresa un número entero.' : dirty ? `Sin guardar · antes ${base[a]}` : ''}
                        </span>
                    </form>
                );
            })}
        </div>
    );
}
