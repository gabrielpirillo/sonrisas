'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Building2, Loader2, Lock, Mail, User } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import { initBillingCountryAction } from '@/lib/billing/actions';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import { authErrorMessage } from '@/components/auth/authErrors';

/** País probable del navegador: zona horaria primero, idioma después. */
function detectCountry(): string {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (/^(Europe\/Madrid|Atlantic\/Canary|Africa\/Ceuta)$/.test(tz)) return 'ES';
        if (/^America\/(Argentina\/|Buenos_Aires)/.test(tz)) return 'AR';
    } catch { /* sin zona horaria */ }
    const region = (navigator.language || '').split('-')[1]?.toUpperCase();
    return region && /^[A-Z]{2}$/.test(region) ? region : 'US';
}

/** Destino tras el login (?next=), solo rutas relativas del mismo origen. */
function nextDestination(): string {
    const fallback = '/administracion/dashboard';
    try {
        const raw = new URLSearchParams(window.location.search).get('next');
        if (!raw || raw.length > 1024 || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
        const url = new URL(raw, window.location.origin);
        if (url.origin !== window.location.origin || /^\/(acceso|login)/.test(url.pathname)) return fallback;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return fallback;
    }
}

function slugify(s: string): string {
    return (
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32) || 'clinica'
    ) + '-' + Math.random().toString(36).slice(2, 6);
}

export default function AccesoPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    // Error visible junto al botón (en español), en lugar de un toast que en
    // el móvil tapa el formulario.
    const [formError, setFormError] = useState<string | null>(null);

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
        setFormError(null);
        setLoading(true);
        const { error } = await authClient.signIn.email({ email: email.trim(), password });
        if (error) {
            setLoading(false);
            setFormError(authErrorMessage(error, 'No pudimos iniciar sesión. Inténtalo de nuevo.'));
            return;
        }
        // Se mantiene "cargando" hasta que cambia la página.
        router.push(nextDestination());
    }

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);
        setLoading(true);
        try {
            const { error } = await authClient.signUp.email({ email: suEmail.trim(), password: suPass, name: name.trim() });
            if (error) throw new Error(authErrorMessage(error, 'No se pudo crear la cuenta. Inténtalo de nuevo.'));
            // Crear la clínica (organización) del nuevo usuario y activarla.
            const created = await authClient.organization.create({ name: clinicName, slug: slugify(clinicName) });
            const orgId = (created as { data?: { id?: string } | null } | null)?.data?.id;
            if (orgId) {
                await authClient.organization.setActive({ organizationId: orgId });
                // País de facturación inicial (define la moneda): se puede cambiar en Créditos.
                await initBillingCountryAction(detectCountry()).catch(() => {});
            }
            toast.success('Cuenta y clínica creadas');
            router.push('/administracion/dashboard');
        } catch (err) {
            setFormError((err instanceof Error && err.message) || 'No se pudo crear la cuenta. Inténtalo de nuevo.');
            setLoading(false);
        }
    }

    const [tab, setTab] = useState<'login' | 'signup'>('login');
    // /acceso?modo=registro abre directamente "Crear cuenta" (enlaces de la landing y la demo).
    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('modo') === 'registro') setTab('signup');
    }, []);
    const isLogin = tab === 'login';
    const switchTab = (t: 'login' | 'signup') => {
        setTab(t);
        setFormError(null);
    };
    const errorBox = formError ? (
        <p className="sf-auth-error" role="alert">
            <AlertCircle size={17} />
            <span>{formError}</span>
        </p>
    ) : null;

    return (
        <MotionConfig reducedMotion="user">
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
                <button type="button" role="tab" aria-selected={isLogin} onClick={() => switchTab('login')}>Entrar</button>
                <button type="button" role="tab" aria-selected={!isLogin} onClick={() => switchTab('signup')}>Crear cuenta</button>
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
                        <AuthField id="email" label="Email" icon={Mail} type="email" autoComplete="email" enterKeyHint="next" placeholder="tu@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <AuthField id="password" label="Contraseña" icon={Lock} type="password" autoComplete="current-password" enterKeyHint="go" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <div className="sf-auth-row">
                            <Link href="/forgot-password" className="sf-auth-link">¿Olvidaste tu contraseña?</Link>
                        </div>
                        {errorBox}
                        <button type="submit" className="sf-auth-btn" disabled={loading} aria-busy={loading || undefined}>
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
                        <AuthField id="name" label="Tu nombre" icon={User} autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} required />
                        <AuthField id="clinicName" label="Nombre de la clínica" icon={Building2} autoComplete="organization" autoCapitalize="words" enterKeyHint="next" placeholder="Clínica dental…" value={clinicName} onChange={(e) => setClinicName(e.target.value)} required />
                        <AuthField id="suEmail" label="Email" icon={Mail} type="email" autoComplete="email" enterKeyHint="next" placeholder="tu@clinica.com" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} required />
                        <AuthField id="suPass" label="Contraseña" icon={Lock} type="password" autoComplete="new-password" enterKeyHint="go" placeholder="Mínimo 8 caracteres" value={suPass} onChange={(e) => setSuPass(e.target.value)} minLength={8} required />
                        {errorBox}
                        <button type="submit" className="sf-auth-btn" disabled={loading} aria-busy={loading || undefined}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Crear cuenta y clínica <ArrowRight size={17} className="arrow" /></>}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
        </AuthShell>
        </MotionConfig>
    );
}
