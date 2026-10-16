import { redirect } from 'next/navigation';
import { isImpersonating } from '@/lib/auth/context';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function UpdatePasswordPage() {
    if (await isImpersonating()) redirect('/administracion/dashboard');
    return (
        <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl font-bold tracking-tight">Cambiar contraseña</h1>
                    <p className="text-sm text-muted-foreground">Ingresa tu contraseña actual y la nueva.</p>
                </div>
                <ChangePasswordForm redirectTo="/administracion/dashboard" />
            </div>
        </div>
    );
}
