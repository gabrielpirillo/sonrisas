'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Globe2, Loader2 } from 'lucide-react';
import { setBillingCountryAction } from '@/lib/billing/actions';

const OPTIONS = [
    { value: 'AR', label: 'Argentina', currency: 'pesos argentinos (ARS)' },
    { value: 'CL', label: 'Chile', currency: 'pesos chilenos (CLP)' },
    { value: 'CO', label: 'Colombia', currency: 'pesos colombianos (COP)' },
    { value: 'EC', label: 'Ecuador', currency: 'dólares (USD)' },
    { value: 'ES', label: 'España', currency: 'euros (EUR)' },
    { value: 'PY', label: 'Paraguay', currency: 'guaraníes (PYG)' },
    { value: 'UY', label: 'Uruguay', currency: 'pesos uruguayos (UYU)' },
    { value: 'US', label: 'Otro país', currency: 'dólares (USD)' },
];

/** País de facturación de la clínica: define la moneda en la que se cobra. */
export function BillingCountry({ country, disabled }: { country: string | null; disabled?: boolean }) {
    const router = useRouter();
    const current = OPTIONS.some((o) => o.value === country) ? (country as string) : 'US';
    const [value, setValue] = useState(current);
    const [pending, start] = useTransition();
    const opt = OPTIONS.find((o) => o.value === value) ?? OPTIONS[OPTIONS.length - 1];

    const change = (next: string) => {
        const prev = value;
        setValue(next);
        start(async () => {
            const r = await setBillingCountryAction(next);
            if (!r.ok) {
                setValue(prev);
                toast.error(r.error);
                return;
            }
            toast.success('País de facturación actualizado');
            router.refresh();
        });
    };

    return (
        <div className="cr-country">
            <Globe2 size={16} aria-hidden />
            <label htmlFor="cr-country-select">Facturación</label>
            <select
                id="cr-country-select"
                className="field"
                value={value}
                disabled={disabled || pending}
                onChange={(e) => change(e.target.value)}
            >
                {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="cr-country-cur">{pending ? <Loader2 size={14} className="animate-spin" /> : `Precios en ${opt.currency} al cambio del día`}</span>
        </div>
    );
}
