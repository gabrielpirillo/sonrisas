'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setCreditCost } from '@/lib/platform/queries';

export function CostsForm({ costs }: { costs: Array<{ action: string; credits: number }> }) {
    const router = useRouter();
    const initial: Record<string, number> = {};
    costs.forEach((c) => (initial[c.action] = c.credits));
    const [vals, setVals] = useState<Record<string, number>>({ image: initial.image ?? 1, video: initial.video ?? 4 });
    const [saving, setSaving] = useState(false);

    async function save(action: string) {
        setSaving(true);
        const res = await setCreditCost(action, vals[action]);
        setSaving(false);
        if (!res.ok) return toast.error(res.error || 'Error');
        toast.success('Costo actualizado'); router.refresh();
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            {(['image', 'video'] as const).map((a) => (
                <div key={a} style={{ padding: 16, borderRadius: 16, border: '1px solid var(--blue-line)', background: 'linear-gradient(180deg, #fff, var(--blue-tint))' }}>
                    <span className="mono" style={{ fontSize: 9, display: 'block', marginBottom: 10 }}>{a === 'image' ? 'CRÉDITOS POR IMAGEN' : 'CRÉDITOS POR VIDEO'}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            className="field"
                            type="number"
                            min={0}
                            value={vals[a]}
                            onChange={(e) => setVals({ ...vals, [a]: parseInt(e.target.value || '0', 10) })}
                            style={{ width: 90, height: 42, fontSize: 16, fontWeight: 600 }}
                            aria-label={a === 'image' ? 'Créditos por imagen' : 'Créditos por video'}
                        />
                        <button className="btn btn-primary btn-sm" disabled={saving} onClick={() => save(a)} style={{ height: 42 }}>Guardar</button>
                    </div>
                </div>
            ))}
        </div>
    );
}
