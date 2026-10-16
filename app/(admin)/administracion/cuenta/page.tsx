import { getAuthContext } from '@/lib/auth/context';
import { PageHead } from "@/components/admin/qoves/PageHead";
import { AccountCards } from "@/components/admin/qoves/AccountCards";

export const dynamic = 'force-dynamic';

export default async function CuentaPage() {
    const ctx = await getAuthContext();
    const impersonating = Boolean(ctx?.impersonatedBy);

    return (
        <div className="admin-page">
            <PageHead title="Cuenta" subtitle="Tu acceso y seguridad" />
            <AccountCards name={ctx?.name} email={ctx?.email} impersonating={impersonating} />
        </div>
    );
}
