'use server';

/**
 * Aceptación de los textos legales por las clínicas (términos, contrato de
 * encargo y privacidad). Las versiones salen siempre del servidor
 * (lib/legal/versions.ts), nunca del navegador.
 */
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { getAuthContext, hasOrgRole, type AuthContext } from '@/lib/auth/context';
import { ipFromHeaders, rateLimit } from '@/lib/security';
import { DPA_VERSION, PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions';

type LegalDocument = 'terms' | 'dpa' | 'privacy';

const CURRENT: Record<LegalDocument, string> = {
    terms: TERMS_VERSION,
    dpa: DPA_VERSION,
    privacy: PRIVACY_VERSION,
};

/** sha256(IP + secreto del servidor). Nunca se guarda la IP en claro. */
function hashIp(ip: string): string | null {
    if (!ip || ip === 'unknown') return null;
    const secret = process.env.CONSENT_IP_SECRET || process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET || '';
    return createHash('sha256').update(`smilefast-legal:${ip}:${secret}`).digest('hex');
}

/** Inserta las versiones vigentes de los tres documentos (idempotente). */
async function recordCurrent(ctx: AuthContext): Promise<void> {
    const h = await headers();
    const ipHash = hashIp(await ipFromHeaders());
    const userAgent = (h.get('user-agent') || '').slice(0, 300) || null;
    const clinicId = ctx.clinic?.id ?? null;
    for (const [doc, version] of Object.entries(CURRENT) as [LegalDocument, string][]) {
        await db.query(
            `INSERT INTO legal_acceptances (user_id, clinic_id, document, version, ip_hash, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT DO NOTHING`,
            [ctx.userId, clinicId, doc, version, ipHash, userAgent]
        );
    }
}

/**
 * Registra la aceptación marcada en el alta ("Crear cuenta"). Se llama justo
 * después de crear la cuenta y la clínica, ya con sesión. Idempotente.
 */
export async function recordSignupAcceptanceAction(accepted: boolean): Promise<{ ok: boolean }> {
    if (accepted !== true) return { ok: false };
    const ctx = await getAuthContext();
    if (!ctx || ctx.impersonatedBy) return { ok: false };
    if (!rateLimit(`legal-accept:${ctx.userId}`, 20, 60 * 60_000)) return { ok: false };
    try {
        await recordCurrent(ctx);
        return { ok: true };
    } catch (e) {
        console.error('[legal] No se pudo registrar la aceptación del alta:', e);
        return { ok: false };
    }
}

export interface LegalStatus {
    /** Mostrar el aviso de nuevas versiones (solo owner/admin y si la clínica no las aceptó). */
    needsAcceptance: boolean;
}

/** ¿La clínica activa tiene aceptadas las versiones vigentes de términos y encargo? */
export async function getLegalStatusAction(): Promise<LegalStatus> {
    const ctx = await getAuthContext();
    if (!ctx?.clinic || ctx.impersonatedBy || !hasOrgRole(ctx.role, ['owner', 'admin'])) return { needsAcceptance: false };
    try {
        const row = await db.queryOne<{ n: number }>(
            `SELECT COUNT(DISTINCT document)::int AS n FROM legal_acceptances
             WHERE clinic_id = $1 AND ((document = 'terms' AND version = $2) OR (document = 'dpa' AND version = $3))`,
            [ctx.clinic.id, TERMS_VERSION, DPA_VERSION]
        );
        return { needsAcceptance: (row?.n ?? 0) < 2 };
    } catch (e) {
        // Si la tabla aún no existe (migración pendiente) no se molesta al usuario.
        console.error('[legal] No se pudo comprobar la aceptación:', e);
        return { needsAcceptance: false };
    }
}

/** Acepta las versiones vigentes desde el aviso del panel (solo owner/admin). */
export async function acceptCurrentLegalAction(): Promise<{ ok: boolean; error?: string }> {
    const ctx = await getAuthContext();
    if (!ctx) return { ok: false, error: 'Tu sesión expiró. Vuelve a entrar.' };
    if (ctx.impersonatedBy) return { ok: false, error: 'No disponible durante una impersonación.' };
    if (!ctx.clinic) return { ok: false, error: 'Selecciona una clínica primero.' };
    if (!hasOrgRole(ctx.role, ['owner', 'admin'])) return { ok: false, error: 'Solo los administradores de la clínica pueden aceptarlos.' };
    if (!rateLimit(`legal-accept:${ctx.userId}`, 20, 60 * 60_000)) return { ok: false, error: 'Demasiados intentos. Espera unos minutos.' };
    try {
        await recordCurrent(ctx);
        return { ok: true };
    } catch (e) {
        console.error('[legal] No se pudo registrar la aceptación:', e);
        return { ok: false, error: 'No se pudo guardar. Inténtalo de nuevo.' };
    }
}
