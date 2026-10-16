'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setCreditCost } from '@/lib/platform/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
            {(['image', 'video'] as const).map((a) => (
                <div key={a} className="space-y-2">
                    <Label>{a === 'image' ? 'Créditos por imagen' : 'Créditos por video'}</Label>
                    <div className="flex gap-2">
                        <Input type="number" min={0} value={vals[a]} onChange={(e) => setVals({ ...vals, [a]: parseInt(e.target.value || '0', 10) })} className="w-24" />
                        <Button size="sm" disabled={saving} onClick={() => save(a)}>Guardar</Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
