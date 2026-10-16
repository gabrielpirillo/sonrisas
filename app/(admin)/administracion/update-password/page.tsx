import { redirect } from 'next/navigation';
import { isImpersonating } from '@/lib/auth/context';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { PageHead } from '@/components/admin/qoves/PageHead';

export const dynamic = 'force-dynamic';

export default async function UpdatePasswordPage() {
    if (await isImpersonating()) redirect('/administracion/dashboard');
    return (
        <div className="admin-page">
            <PageHead eyebrow="SEGURIDAD" title="Cambiar" accent="contraseña" subtitle="Ingresa tu contraseña actual y elige una nueva de al menos 8 caracteres." />
            <div className="card" style={{ padding: 24, maxWidth: 480 }}>
                <ChangePasswordForm redirectTo="/administracion/dashboard" />
            </div>
        </div>
    );
}
