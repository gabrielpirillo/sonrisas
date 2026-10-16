/**
 * Quién puede actuar sobre un lead desde rutas que envían emails.
 *
 * - Panel: un usuario con sesión puede operar sobre los leads de su clínica.
 * - Widget: el paciente solo puede operar sobre el lead que acaba de crear
 *   (ventana corta), con límite por lead y por IP.
 * El destinatario sale siempre de la base de datos, nunca del body.
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext } from '@/lib/auth/context';
import { ipFromRequest, rateLimit } from '@/lib/security';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LeadRow {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    clinic_id: string | null;
    is_recent: boolean;
}

export type LeadAccess =
    | { ok: true; lead: LeadRow; via: 'clinic' | 'widget' }
    | { ok: false; status: number; error: string };

export async function getLeadForEmail(
    req: NextRequest,
    leadId: unknown,
    opts: { allowWidget: boolean }
): Promise<LeadAccess> {
    if (typeof leadId !== 'string' || !UUID_RE.test(leadId)) {
        return { ok: false, status: 400, error: 'leadId inválido' };
    }

    const lead = await db.queryOne<LeadRow>(
        `SELECT id, name, email, phone, clinic_id,
                (created_at > now() - interval '6 hours') AS is_recent
         FROM leads WHERE id = $1`,
        [leadId]
    );
    if (!lead?.email) return { ok: false, status: 404, error: 'Lead no encontrado' };

    const ctx = await getAuthContext();
    if (ctx?.clinic && lead.clinic_id === ctx.clinic.id) {
        if (ctx.impersonatedBy) {
            return { ok: false, status: 403, error: 'No disponible durante una impersonación.' };
        }
        return { ok: true, lead, via: 'clinic' };
    }

    if (!opts.allowWidget) return { ok: false, status: 401, error: 'No autenticado' };
    if (!lead.is_recent) return { ok: false, status: 403, error: 'Operación no permitida' };

    const ip = ipFromRequest(req);
    if (!rateLimit(`mail-lead:${lead.id}`, 3, 60 * 60_000) || !rateLimit(`mail-ip:${ip}`, 10, 60 * 60_000)) {
        return { ok: false, status: 429, error: 'Demasiadas solicitudes. Inténtalo más tarde.' };
    }
    return { ok: true, lead, via: 'widget' };
}

/**
 * Email que recibe los avisos de la clínica: CLINIC_NOTIFICATION_EMAIL si está
 * definido; si no, el email del owner de la organización de la clínica.
 */
export async function clinicNotificationEmail(clinicId: string | null): Promise<string | null> {
    if (process.env.CLINIC_NOTIFICATION_EMAIL) return process.env.CLINIC_NOTIFICATION_EMAIL;
    if (!clinicId) return null;
    const row = await db.queryOne<{ email: string }>(
        `SELECT u.email FROM clinics c
         JOIN public.member m ON m."organizationId" = c.org_id AND m.role = 'owner'
         JOIN public."user" u ON u.id = m."userId"
         WHERE c.id = $1
         ORDER BY m."createdAt" ASC
         LIMIT 1`,
        [clinicId]
    );
    return row?.email ?? null;
}
