'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createCheckoutSession } from '@/lib/billing/actions';
import { Button } from '@/components/ui/button';

type Pkg = { id: string; label: string; credits: number; available: boolean };

export function BuyCredits({ packages, stripeEnabled, impersonating }: { packages: Pkg[]; stripeEnabled: boolean; impersonating?: boolean }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    if (impersonating) {
        return <p className="text-sm text-muted-foreground">La compra no está disponible durante una impersonación (solo lectura).</p>;
    }
    if (!stripeEnabled) {
        return <p className="text-sm text-muted-foreground">La compra no está disponible: falta configurar Stripe (STRIPE_SECRET_KEY).</p>;
    }
    async function buy(id: string) {
        setLoadingId(id);
        const res = await createCheckoutSession(id);
        setLoadingId(null);
        if (res.error) return toast.error(res.error);
        if (res.url) window.location.href = res.url;
    }
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {packages.map((p) => (
                <div key={p.id} className="border rounded-lg p-4 flex flex-col gap-2">
                    <div className="text-lg font-semibold">{p.label}</div>
                    <div className="text-sm text-muted-foreground">{p.credits} créditos</div>
                    <Button size="sm" disabled={!p.available || loadingId === p.id} onClick={() => buy(p.id)}>
                        {loadingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : p.available ? 'Comprar' : 'No disponible'}
                    </Button>
                </div>
            ))}
        </div>
    );
}
