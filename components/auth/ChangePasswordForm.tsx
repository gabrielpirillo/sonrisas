'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { authErrorMessage } from './authErrors';

export function ChangePasswordForm({ redirectTo }: { redirectTo?: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (next.length < 8) return toast.error('La nueva contraseña debe tener al menos 8 caracteres');
        if (next !== confirm) return toast.error('Las contraseñas no coinciden');

        setLoading(true);
        const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
        });
        setLoading(false);

        if (error) return toast.error(authErrorMessage(error, 'No se pudo cambiar la contraseña. Revisa la actual e inténtalo de nuevo.'));
        toast.success('Contraseña actualizada');
        setCurrent(''); setNext(''); setConfirm('');
        if (redirectTo) router.push(redirectTo);
    }

    const field = (id: string, label: string, value: string, set: (v: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
        <div>
            <label htmlFor={id} className="mono" style={{ display: 'block', fontSize: 9, marginBottom: 7 }}>{label}</label>
            {/* 16px evita el zoom de iOS al enfocar; 48px de alto, cómodo al tacto */}
            <input id={id} className="field" type="password" value={value} onChange={(e) => set(e.target.value)} required
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                style={{ height: 48, fontSize: 16 }} {...extra} />
        </div>
    );

    return (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {field('current', 'CONTRASEÑA ACTUAL', current, setCurrent, { autoComplete: 'current-password' })}
            {field('next', 'NUEVA CONTRASEÑA', next, setNext, { minLength: 8, autoComplete: 'new-password' })}
            {field('confirm', 'CONFIRMAR NUEVA CONTRASEÑA', confirm, setConfirm, { autoComplete: 'new-password' })}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, justifyContent: 'center', minHeight: 48 }}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Actualizar contraseña'}
            </button>
        </form>
    );
}
