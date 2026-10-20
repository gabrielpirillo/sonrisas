'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, UserCog, Ban, ShieldCheck, Trash2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { logImpersonationStart } from '@/lib/platform/queries';

type AuthResult = { error?: { message?: string } | null } | null | undefined;
const errorOf = (res: unknown) => (res as AuthResult)?.error ?? null;

/**
 * Acciones sobre un usuario de la plataforma.
 * `labels`: botones con texto (lista móvil, donde no hay tooltip al pasar el ratón).
 */
export function UserActions({ userId, email, banned, labels = false }: { userId: string; email: string; banned: boolean; labels?: boolean }) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);

    async function impersonate() {
        setBusy('imp');
        await logImpersonationStart(userId, email).catch(() => {});
        const res = await authClient.admin.impersonateUser({ userId });
        setBusy(null);
        const err = errorOf(res);
        if (err) return toast.error(err.message || 'No se pudo impersonar');
        toast.success(`Impersonando a ${email}`);
        window.location.href = '/administracion/dashboard';
    }

    async function toggleBan() {
        if (!banned && !confirm(`¿Bloquear a ${email}? No podrá iniciar sesión hasta que lo reactives.`)) return;
        setBusy('ban');
        const res = banned
            ? await authClient.admin.unbanUser({ userId })
            : await authClient.admin.banUser({ userId, banReason: 'Suspendido por plataforma' });
        setBusy(null);
        const err = errorOf(res);
        if (err) return toast.error(err.message || 'Error');
        toast.success(banned ? 'Usuario reactivado' : 'Usuario bloqueado');
        router.refresh();
    }

    async function remove() {
        if (!confirm(`¿Eliminar a ${email}? Esta acción es irreversible.`)) return;
        setBusy('del');
        const res = await authClient.admin.removeUser({ userId });
        setBusy(null);
        const err = errorOf(res);
        if (err) return toast.error(err.message || 'Error');
        toast.success('Usuario eliminado'); router.refresh();
    }

    const spin = <Loader2 className="animate-spin" size={15} aria-hidden />;
    const banLabel = banned ? 'Reactivar' : 'Bloquear';

    if (labels) {
        return (
            <div className="sa-acts">
                <button type="button" className="sa-act" aria-label={`Impersonar a ${email}`} onClick={impersonate} disabled={!!busy}>
                    {busy === 'imp' ? spin : <UserCog size={15} aria-hidden />}<span>Impersonar</span>
                </button>
                <button type="button" className="sa-act" aria-label={`${banLabel} a ${email}`} onClick={toggleBan} disabled={!!busy}>
                    {busy === 'ban' ? spin : banned ? <ShieldCheck size={15} aria-hidden /> : <Ban size={15} aria-hidden />}<span>{banLabel}</span>
                </button>
                <button type="button" className="sa-act sa-act-danger sa-act-icon" title="Eliminar" aria-label={`Eliminar a ${email}`} onClick={remove} disabled={!!busy}>
                    {busy === 'del' ? spin : <Trash2 size={16} aria-hidden />}
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" className="icon-btn" title="Impersonar" aria-label={`Impersonar a ${email}`} onClick={impersonate} disabled={!!busy}>
                {busy === 'imp' ? spin : <UserCog size={15} aria-hidden />}
            </button>
            <button type="button" className="icon-btn" title={banLabel} aria-label={`${banLabel} a ${email}`} onClick={toggleBan} disabled={!!busy}>
                {busy === 'ban' ? spin : banned ? <ShieldCheck size={15} aria-hidden /> : <Ban size={15} aria-hidden />}
            </button>
            <button type="button" className="icon-btn icon-btn-danger" title="Eliminar" aria-label={`Eliminar a ${email}`} onClick={remove} disabled={!!busy}>
                {busy === 'del' ? spin : <Trash2 size={15} aria-hidden />}
            </button>
        </div>
    );
}
