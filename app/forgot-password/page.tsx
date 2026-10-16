'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowRight, Loader2, Mail, MailCheck } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const { error } = await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' });
        setLoading(false);
        if (error) return toast.error(error.message || 'No se pudo enviar el correo');
        setSent(true);
        toast.success('Si el correo existe, te enviamos un enlace de restablecimiento');
    }

    return (
        <AuthShell
            eyebrow="Recuperar acceso"
            title="¿Olvidaste tu"
            accent="contraseña?"
            subtitle="Escribe el email de tu cuenta y te enviaremos un enlace para crear una nueva. El enlace caduca en 1 hora."
            back={{ href: '/acceso', label: 'Volver al acceso' }}
        >
            {sent ? (
                <div className="sf-auth-form">
                    <div className="sf-auth-note">
                        <MailCheck size={18} />
                        <span>Revisa tu correo. Si no llega en unos minutos, mira en spam o verifica que el email sea correcto.</span>
                    </div>
                    <Link href="/acceso" className="sf-auth-btn sf-auth-btn-ghost">Volver al acceso</Link>
                </div>
            ) : (
                <form onSubmit={onSubmit} className="sf-auth-form">
                    <AuthField id="email" label="Email" icon={Mail} type="email" autoComplete="email" placeholder="tu@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <button type="submit" className="sf-auth-btn" disabled={loading}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <>Enviar enlace <ArrowRight size={17} className="arrow" /></>}
                    </button>
                </form>
            )}
        </AuthShell>
    );
}
