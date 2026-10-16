/**
 * Rol de plataforma (super-admin del SaaS), distinto de los roles por clínica.
 * Se define por allowlist de emails en PLATFORM_ADMIN_EMAILS (coma-separados).
 */
import { getAuthContext } from '@/lib/auth/context';
import { db } from '@/lib/db';

export function platformAdminEmails(): string[] {
    return (process.env.PLATFORM_ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

export function isPlatformAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    return platformAdminEmails().includes(email.toLowerCase());
}

/** Devuelve el email si la sesión es super-admin de plataforma, o null. */
export async function getPlatformAdmin(): Promise<string | null> {
    const ctx = await getAuthContext();
    if (ctx && isPlatformAdminEmail(ctx.email)) return ctx.email;
    return null;
}

export async function requirePlatformAdmin(): Promise<string> {
    const email = await getPlatformAdmin();
    if (!email) throw new Error('Forbidden: requiere super-admin de plataforma');
    return email;
}

/**
 * Promueve a los emails de la allowlist al role 'admin' de Better Auth para que
 * el plugin admin (impersonación/gestión de usuarios) los autorice. Idempotente.
 */
export async function ensurePlatformAdminRole(): Promise<void> {
    const emails = platformAdminEmails();
    if (emails.length === 0) return;
    try {
        await db.query(
            `UPDATE "user" SET role = 'admin'
             WHERE lower(email) = ANY($1) AND (role IS DISTINCT FROM 'admin')`,
            [emails]
        );
    } catch (e) {
        console.error('[platform] ensurePlatformAdminRole failed:', e);
    }
}
