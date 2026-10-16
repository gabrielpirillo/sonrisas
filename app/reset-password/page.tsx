'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';

function ResetInner() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get('token') || '';
    const error = params.get('error');
    const [pass, setPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (pass.length < 8) return toast.error('Mínimo 8 caracteres');
        if (pass !== confirm) return toast.error('Las contraseñas no coinciden');
        setLoading(true);
        const res = await authClient.resetPassword({ newPassword: pass, token });
        setLoading(false);
        if (res.error) return toast.error(res.error.message || 'El enlace es inválido o caducó');
        toast.success('Contraseña restablecida. Inicia sesión.');
        router.push('/acceso');
    }

    if (error || !token) {
        return (
            <AuthShell
                eyebrow="Recuperar acceso"
                title="Enlace"
                accent="no válido."
                subtitle="El enlace es inválido o ya caducó. Solicita uno nuevo para continuar."
                back={{ href: '/acceso', label: 'Volver al acceso' }}
            >
                <div className="sf-auth-form">
                    <div className="sf-auth-note danger">
                        <AlertTriangle size={18} />
                        <span>Por seguridad, cada enlace solo sirve una vez y caduca en 1 hora.</span>
                    </div>
                    <Link href="/forgot-password" className="sf-auth-btn">Solicitar uno nuevo <ArrowRight size={17} className="arrow" /></Link>
                </div>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            eyebrow="Recuperar acceso"
            title="Crea una"
            accent="contraseña nueva."
            subtitle="Usa al menos 8 caracteres. Después podrás entrar con ella a tu panel."
            back={{ href: '/acceso', label: 'Volver al acceso' }}
        >
            <form onSubmit={onSubmit} className="sf-auth-form">
                <AuthField id="pass" label="Nueva contraseña" icon={Lock} type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={pass} onChange={(e) => setPass(e.target.value)} minLength={8} required />
                <AuthField id="confirm" label="Confirmar contraseña" icon={ShieldCheck} type="password" autoComplete="new-password" placeholder="Repite la contraseña" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                <button type="submit" className="sf-auth-btn" disabled={loading}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <>Restablecer <ArrowRight size={17} className="arrow" /></>}
                </button>
            </form>
        </AuthShell>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <ResetInner />
        </Suspense>
    );
}
