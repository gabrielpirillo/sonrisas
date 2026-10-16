'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
        router.push('/login');
    }

    if (error || !token) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader><CardTitle>Enlace inválido</CardTitle>
                    <CardDescription>El enlace es inválido o caducó.</CardDescription></CardHeader>
                <CardContent><Link href="/forgot-password"><Button>Solicitar uno nuevo</Button></Link></CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader><CardTitle>Nueva contraseña</CardTitle>
                <CardDescription>Ingresa tu nueva contraseña.</CardDescription></CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="pass">Nueva contraseña</Label>
                        <Input id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} minLength={8} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm">Confirmar contraseña</Label>
                        <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Restablecer'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
                <ResetInner />
            </Suspense>
        </div>
    );
}
