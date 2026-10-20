'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Wordmark } from '@/components/admin/qoves/LogoMark';

/**
 * Las invitaciones llegan por email con credenciales temporales.
 * Si alguien entra aquí, lo llevamos al acceso.
 */
export default function InvitePage() {
    const router = useRouter();
    const [message, setMessage] = useState('Verificando invitación…');

    useEffect(() => {
        const t = setTimeout(() => {
            setMessage('Redirigiendo al acceso…');
            router.push('/acceso');
        }, 2000);
        return () => clearTimeout(t);
    }, [router]);

    return (
        <div
            className="flex min-h-dvh w-full flex-col items-center justify-center gap-5"
            style={{ background: 'radial-gradient(60% 50% at 50% 0%, var(--blue-tint), #fff 70%)' }}
        >
            <div className="sf-rise"><Wordmark height={24} /></div>
            <Loader2 className="h-7 w-7 motion-safe:animate-spin" style={{ color: 'var(--blue-deep)' }} aria-hidden="true" />
            <p className="text-sm" style={{ color: 'var(--ink-2)' }} role="status" aria-live="polite">{message}</p>
        </div>
    );
}
