'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function slugify(s: string): string {
    return (
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32) || 'clinica'
    ) + '-' + Math.random().toString(36).slice(2, 6);
}

export default function AccesoPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // signup
    const [name, setName] = useState('');
    const [suEmail, setSuEmail] = useState('');
    const [suPass, setSuPass] = useState('');
    const [clinicName, setClinicName] = useState('');

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const { error } = await authClient.signIn.email({ email, password });
        setLoading(false);
        if (error) return toast.error(error.message || 'Credenciales inválidas');
        router.push('/administracion/dashboard');
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await authClient.signUp.email({ email: suEmail, password: suPass, name });
            if (error) throw new Error(error.message);
            // Crear la clínica (organización) del nuevo usuario y activarla.
            const created = await authClient.organization.create({ name: clinicName, slug: slugify(clinicName) });
            const orgId = (created as any)?.data?.id;
            if (orgId) await authClient.organization.setActive({ organizationId: orgId });
            toast.success('Cuenta y clínica creadas');
            router.push('/administracion/dashboard');
        } catch (err: any) {
            toast.error(err.message || 'No se pudo crear la cuenta');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Smile Forward — Panel</CardTitle>
                    <CardDescription>Accede o crea la cuenta de tu clínica.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Entrar</TabsTrigger>
                            <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                                </Button>
                                <p className="text-center text-sm">
                                    <a href="/forgot-password" className="text-primary hover:underline">¿Olvidaste tu contraseña?</a>
                                </p>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleSignup} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Tu nombre</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clinicName">Nombre de la clínica</Label>
                                    <Input id="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="suEmail">Email</Label>
                                    <Input id="suEmail" type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="suPass">Contraseña</Label>
                                    <Input id="suPass" type="password" value={suPass} onChange={(e) => setSuPass(e.target.value)} minLength={8} required />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear cuenta y clínica'}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
