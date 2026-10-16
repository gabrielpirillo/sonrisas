/**
 * Contexto de auth/tenant del lado servidor (Better Auth).
 * Resuelve la sesión, la organización activa y la clínica de billing enlazada.
 */
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/better';
import { getClinicByOrg, type Clinic } from '@/lib/billing/credits';

export interface AuthContext {
    userId: string;
    email: string;
    name?: string;
    activeOrganizationId: string | null;
    clinic: Clinic | null;
    role: string | null; // rol del usuario en la organización activa
    impersonatedBy: string | null; // si la sesión es una impersonación
}

/** Devuelve el contexto de auth, o null si no hay sesión. */
export async function getAuthContext(): Promise<AuthContext | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return null;

    const activeOrganizationId = (session.session as any)?.activeOrganizationId ?? null;
    let clinic: Clinic | null = null;
    let role: string | null = null;

    if (activeOrganizationId) {
        clinic = await getClinicByOrg(activeOrganizationId);
        try {
            const member = await auth.api.getActiveMember({ headers: await headers() });
            role = (member as any)?.role ?? null;
        } catch {
            role = null;
        }
    }

    return {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        activeOrganizationId,
        clinic,
        role,
        impersonatedBy: (session.session as any)?.impersonatedBy ?? null,
    };
}

/** True si la sesión actual es una impersonación (acceso de solo lectura). */
export async function isImpersonating(): Promise<boolean> {
    const ctx = await getAuthContext();
    return Boolean(ctx?.impersonatedBy);
}

/** Lanza si no hay sesión. Opcionalmente exige un rol (owner/admin). */
export async function requireAuthContext(roles?: string[]): Promise<AuthContext> {
    const ctx = await getAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    if (roles && roles.length > 0 && (!ctx.role || !roles.includes(ctx.role))) {
        throw new Error('Forbidden');
    }
    return ctx;
}
