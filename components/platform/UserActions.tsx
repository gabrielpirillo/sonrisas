'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, UserCog, Ban, ShieldCheck, Trash2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { logImpersonationStart } from '@/lib/platform/queries';
import { Button } from '@/components/ui/button';

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
        <div className="flex gap-1 justify-end">
            <Button variant="ghost" size="sm" title="Impersonar" onClick={impersonate} disabled={!!busy}>
                {busy === 'imp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" title={banned ? 'Reactivar' : 'Bloquear'} onClick={toggleBan} disabled={!!busy}>
                {busy === 'ban' ? <Loader2 className="h-4 w-4 animate-spin" /> : banned ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-amber-600" />}
            </Button>
            <Button variant="ghost" size="sm" title="Eliminar" onClick={remove} disabled={!!busy}>
                {busy === 'del' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
            </Button>
        </div>
    );
}
