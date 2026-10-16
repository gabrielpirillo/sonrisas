'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, UserCog, Ban, ShieldCheck, Trash2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { logImpersonationStart } from '@/lib/platform/queries';

export function UserActions({ userId, email, banned }: { userId: string; email: string; banned: boolean }) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);

    async function impersonate() {
        setBusy('imp');
        await logImpersonationStart(userId, email).catch(() => {});
        const res = await authClient.admin.impersonateUser({ userId });
        setBusy(null);
        if ((res as any)?.error) return toast.error((res as any).error.message || 'No se pudo impersonar');
        toast.success(`Impersonando a ${email}`);
        window.location.href = '/administracion/dashboard';
    }

    async function toggleBan() {
        setBusy('ban');
        const res = banned
            ? await authClient.admin.unbanUser({ userId })
            : await authClient.admin.banUser({ userId, banReason: 'Suspendido por plataforma' });
        setBusy(null);
        if ((res as any)?.error) return toast.error((res as any).error.message || 'Error');
        toast.success(banned ? 'Usuario reactivado' : 'Usuario bloqueado');
        router.refresh();
    }

    async function remove() {
        if (!confirm(`¿Eliminar a ${email}? Esta acción es irreversible.`)) return;
        setBusy('del');
        const res = await authClient.admin.removeUser({ userId });
        setBusy(null);
        if ((res as any)?.error) return toast.error((res as any).error.message || 'Error');
        toast.success('Usuario eliminado'); router.refresh();
    }

    return (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button className="icon-btn" title="Impersonar" aria-label={`Impersonar a ${email}`} onClick={impersonate} disabled={!!busy}>
                {busy === 'imp' ? <Loader2 className="animate-spin" size={15} /> : <UserCog size={15} />}
            </button>
            <button className="icon-btn" title={banned ? 'Reactivar' : 'Bloquear'} aria-label={banned ? `Reactivar a ${email}` : `Bloquear a ${email}`} onClick={toggleBan} disabled={!!busy}>
                {busy === 'ban' ? <Loader2 className="animate-spin" size={15} /> : banned ? <ShieldCheck size={15} /> : <Ban size={15} />}
            </button>
            <button className="icon-btn icon-btn-danger" title="Eliminar" aria-label={`Eliminar a ${email}`} onClick={remove} disabled={!!busy}>
                {busy === 'del' ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
            </button>
        </div>
    );
}
