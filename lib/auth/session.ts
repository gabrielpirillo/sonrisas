/**
 * Helpers de sesión (ahora sobre Better Auth).
 * Mantiene la misma API que usaban las páginas/acciones del admin legacy:
 * getSession / requireAuth / isAdmin, mapeando el rol de la organización activa
 * (owner/admin → 'admin', member → 'basic').
 */
import { getAuthContext } from '@/lib/auth/context';
import { db } from '@/lib/db';

export interface SessionUser {
    id: string;
    email: string;
    name?: string;
    role: 'admin' | 'basic';
}

function mapRole(orgRole: string | null): 'admin' | 'basic' {
    return orgRole === 'owner' || orgRole === 'admin' ? 'admin' : 'basic';
}

export async function getSession(): Promise<SessionUser | null> {
    const ctx = await getAuthContext();
    if (!ctx) return null;
    return {
        id: ctx.userId,
        email: ctx.email,
        name: ctx.name,
        role: mapRole(ctx.role),
    };
}

export async function requireAuth(role?: 'admin' | 'basic'): Promise<SessionUser> {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized: Not authenticated');
    if (role && session.role !== role) throw new Error(`Forbidden: Requires ${role} role`);
    return session;
}

export async function isAdmin(): Promise<boolean> {
    const session = await getSession();
    return session?.role === 'admin';
}

/** Legacy: rol desde la tabla user_roles (en desuso tras el flip). */
export async function getUserRole(userId: string): Promise<string | null> {
    const result = await db.queryOne('SELECT role FROM user_roles WHERE user_id = $1', [userId]);
    return result?.role || null;
}
