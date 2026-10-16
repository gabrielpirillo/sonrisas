'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

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
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <Link href="/login" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary mb-2"><ArrowLeft className="w-4 h-4" /> Volver al login</Link>
                    <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
                    <CardDescription>Te enviaremos un enlace para restablecerla.</CardDescription>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <p className="text-sm text-muted-foreground">Revisa tu correo. Si no llega en unos minutos, verifica el spam o que el email sea correcto.</p>
                    ) : (
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar enlace'}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">El enlace caduca en 1 hora.</CardFooter>
            </Card>
        </div>
    );
}
