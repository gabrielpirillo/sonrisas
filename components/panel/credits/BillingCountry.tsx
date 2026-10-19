'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Globe2, Loader2 } from 'lucide-react';
import { setBillingCountryAction } from '@/lib/billing/actions';

const OPTIONS = [
    { value: 'ES', label: 'España', currency: 'Euros (EUR)' },
    { value: 'AR', label: 'Argentina', currency: 'Pesos argentinos (ARS)' },
    { value: 'US', label: 'Otro país', currency: 'Dólares (USD)' },
];

/** País de facturación de la clínica: define la moneda en la que se cobra. */
export function BillingCountry({ country, disabled }: { country: string | null; disabled?: boolean }) {
    const router = useRouter();
    const current = country === 'ES' || country === 'AR' ? country : 'US';
    const [value, setValue] = useState(current);
    const [pending, start] = useTransition();
    const opt = OPTIONS.find((o) => o.value === value) ?? OPTIONS[2];

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
            <span className="cr-country-cur">{pending ? <Loader2 size={14} className="animate-spin" /> : `Precios en ${opt.currency}`}</span>
        </div>
    );
}
