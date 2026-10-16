'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Info, Loader2 } from 'lucide-react';
import { createCheckoutSession } from '@/lib/billing/actions';

type Pkg = { id: string; label: string; credits: number; available: boolean };

function Notice({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 14, background: 'var(--blue-tint)', border: '1px solid var(--blue-line)', fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            <Info size={16} style={{ color: 'var(--blue-deep)', flexShrink: 0, marginTop: 2 }} />
            <span>{children}</span>
        </div>
    );
}

export function BuyCredits({ packages, stripeEnabled, impersonating }: { packages: Pkg[]; stripeEnabled: boolean; impersonating?: boolean }) {
    const [loadingId, setLoadingId] = useState<string | null>(null);
    if (impersonating) {
        return <Notice>La compra no está disponible durante una impersonación (solo lectura).</Notice>;
    }
    if (!stripeEnabled) {
        return <Notice>La compra no está disponible: falta configurar Stripe (STRIPE_SECRET_KEY).</Notice>;
    }
    async function buy(id: string) {
        setLoadingId(id);
        const res = await createCheckoutSession(id);
        setLoadingId(null);
        if (res.error) return toast.error(res.error);
        if (res.url) window.location.assign(res.url);
    }
    return (
        <div className="sf-pkg-grid">
            {packages.map((p, i) => {
                const featured = i === 1;
                return (
                    <div key={p.id} className={`sf-pkg${featured ? ' sf-pkg-featured' : ''}`}>
                        {featured && <span className="sf-pkg-tag">Recomendado</span>}
                        <span className="mono" style={{ fontSize: 9 }}>{p.id.toUpperCase()}</span>
                        <div className="sf-pkg-num">{p.credits.toLocaleString('es')}</div>
                        <div style={{ fontSize: 13, color: featured ? 'rgba(255,255,255,0.65)' : 'var(--ink-3)' }}>créditos</div>
                        <button
                            className={`btn btn-sm ${featured ? 'btn-white' : 'btn-primary'}`}
                            style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                            disabled={!p.available || loadingId === p.id}
                            onClick={() => buy(p.id)}
                        >
                            {loadingId === p.id ? <Loader2 className="animate-spin" size={16} /> : p.available ? 'Comprar' : 'No disponible'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
