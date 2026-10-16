'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

        if (error) return toast.error(error.message || 'No se pudo cambiar la contraseña');
        toast.success('Contraseña actualizada');
        setCurrent(''); setNext(''); setConfirm('');
        if (redirectTo) router.push(redirectTo);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
            <div className="space-y-2">
                <Label htmlFor="current">Contraseña actual</Label>
                <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="next">Nueva contraseña</Label>
                <Input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar nueva contraseña</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar contraseña'}
            </Button>
        </form>
    );
}
