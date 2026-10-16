'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Building2, Loader2, Lock, Mail, User } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';

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

    const [tab, setTab] = useState<'login' | 'signup'>('login');
    const isLogin = tab === 'login';

    return (
        <AuthShell
            eyebrow="Panel de clínicas"
            title={isLogin ? 'Hola de nuevo,' : 'Crea tu cuenta'}
            accent={isLogin ? 'entra a tu panel.' : 'y la de tu clínica.'}
            subtitle={
                isLogin
                    ? 'Revisa tus leads, simulaciones y la configuración del widget.'
                    : 'En minutos tendrás tu panel listo para instalar el widget en tu web.'
            }
        >
            <div className="sf-auth-tabs" role="tablist">
                <motion.span
                    className="sf-auth-tab-pill"
                    animate={{ x: isLogin ? '0%' : '100%' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
                <button type="button" role="tab" aria-selected={isLogin} onClick={() => setTab('login')}>Entrar</button>
                <button type="button" role="tab" aria-selected={!isLogin} onClick={() => setTab('signup')}>Crear cuenta</button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {isLogin ? (
                    <motion.form
                        key="login"
                        onSubmit={handleLogin}
                        className="sf-auth-form"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 14 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <AuthField id="email" label="Email" icon={Mail} type="email" autoComplete="email" placeholder="tu@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <AuthField id="password" label="Contraseña" icon={Lock} type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <div className="sf-auth-row">
                            <Link href="/forgot-password" className="sf-auth-link">¿Olvidaste tu contraseña?</Link>
                        </div>
                        <button type="submit" className="sf-auth-btn" disabled={loading}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Entrar al panel <ArrowRight size={17} className="arrow" /></>}
                        </button>
                    </motion.form>
                ) : (
                    <motion.form
                        key="signup"
                        onSubmit={handleSignup}
                        className="sf-auth-form"
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -14 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <AuthField id="name" label="Tu nombre" icon={User} autoComplete="name" placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} required />
                        <AuthField id="clinicName" label="Nombre de la clínica" icon={Building2} autoComplete="organization" placeholder="Clínica dental…" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
                        <AuthField id="suEmail" label="Email" icon={Mail} type="email" autoComplete="email" placeholder="tu@clinica.com" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} required />
                        <AuthField id="suPass" label="Contraseña" icon={Lock} type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={suPass} onChange={(e) => setSuPass(e.target.value)} minLength={8} required />
                        <button type="submit" className="sf-auth-btn" disabled={loading}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Crear cuenta y clínica <ArrowRight size={17} className="arrow" /></>}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
        </AuthShell>
    );
}
