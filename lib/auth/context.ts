/**
 * Contexto de auth/tenant del lado servidor (Better Auth).
 * Resuelve la sesión, la organización activa y la clínica de billing enlazada.
 */
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/better';
import { db } from '@/lib/db';
import { getClinicByOrg, type Clinic } from '@/lib/billing/credits';

export interface AuthContext {
    userId: string;
    email: string;
    name?: string;
    activeOrganizationId: string | null;
    clinic: Clinic | null;
    role: string | null; // rol del usuario en la organización activa (puede ser "owner,admin")
    impersonatedBy: string | null; // si la sesión es una impersonación
}

/** True si alguno de los roles (Better Auth admite "owner,admin") está permitido. */
export function hasOrgRole(role: string | null | undefined, allowed: string[]): boolean {
    if (!role) return false;
    return role.split(',').map((r) => r.trim()).some((r) => r && allowed.includes(r));
}

/**
 * Devuelve el contexto de auth, o null si no hay sesión.
 * Fail-closed: si el usuario de la sesión no es miembro de la organización
 * activa (o no se puede comprobar), clinic y role son null. En una
 * impersonación la sesión es del usuario impersonado, así que se usa su
 * membresía (la impersonación sigue funcionando igual).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return null;

    const activeOrganizationId = (session.session as any)?.activeOrganizationId ?? null;
    let clinic: Clinic | null = null;
    let role: string | null = null;

    if (activeOrganizationId) {
        try {
            const member = await db.queryOne<{ role: string | null }>(
                'SELECT role FROM member WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1',
                [activeOrganizationId, session.user.id]
            );
            if (member) {
                role = member.role || null;
                clinic = await getClinicByOrg(activeOrganizationId);
            }
        } catch (e) {
            console.error('[auth] No se pudo comprobar la membresía de la organización activa:', e);
            role = null;
            clinic = null;
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
    if (roles && roles.length > 0 && !hasOrgRole(ctx.role, roles)) {
        throw new Error('Forbidden');
    }
    return ctx;
}
