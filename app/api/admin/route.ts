/**
 * API Route: consultas del panel de la clínica.
 * Exige sesión y filtra todo por la clínica activa del usuario.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireClinic } from '@/lib/security';
import { hasOrgRole } from '@/lib/auth/context';
import { eraseLeadForClinic, exportLeadData } from '@/lib/retention';
import { isValidRetention, clinicDeletionDate, RETENTION_LIMITS } from '@/lib/retentionLimits';

const LEAD_STATUSES = ['pending', 'contacted', 'converted', 'rejected'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Acciones con datos personales o destructivas: solo owner/admin. */
const ADMIN_ONLY = ['export_lead_data', 'erase_lead', 'update_retention_settings'];
/** Baja de la clínica: solo el owner. */
const OWNER_ONLY = ['request_clinic_deletion', 'cancel_clinic_deletion'];

export async function POST(req: NextRequest) {
    const { ctx, error } = await requireClinic();
    if (error) return error;
    const clinicId = ctx.clinic.id;

    try {
        const body = await req.json();
        const { action } = body;

        // Impersonación = solo lectura: bloquea exportaciones y escrituras.
        const BLOCKED_WHEN_IMPERSONATING = ['get_generations', 'update_lead_status', ...ADMIN_ONLY, ...OWNER_ONLY];
        if (BLOCKED_WHEN_IMPERSONATING.includes(action) && ctx.impersonatedBy) {
            return NextResponse.json(
                { error: 'No disponible durante una impersonación (solo lectura).' },
                { status: 403 }
            );
        }

        if (ADMIN_ONLY.includes(action) && !hasOrgRole(ctx.role, ['owner', 'admin'])) {
            return NextResponse.json({ error: 'Solo el propietario o un administrador de la clínica puede hacer esto.' }, { status: 403 });
        }
        if (OWNER_ONLY.includes(action) && !hasOrgRole(ctx.role, ['owner'])) {
            return NextResponse.json({ error: 'Solo el propietario de la clínica puede hacer esto.' }, { status: 403 });
        }

        switch (action) {
            case 'get_leads': {
                const result = await db.query(
                    `SELECT l.*,
                        COALESCE(
                            json_agg(g.* ORDER BY g.created_at DESC)
                            FILTER (WHERE g.id IS NOT NULL), '[]'
                        ) as generations
                     FROM leads l
                     LEFT JOIN generations g ON g.lead_id = l.id
                     WHERE l.clinic_id = $1
                     GROUP BY l.id
                     ORDER BY l.created_at DESC`,
                    [clinicId]
                );
                return NextResponse.json({ data: result.rows });
            }

            case 'get_generations': {
                const result = await db.query(
                    `SELECT g.* FROM generations g
                     JOIN leads l ON l.id = g.lead_id
                     WHERE l.clinic_id = $1
                     ORDER BY g.created_at DESC`,
                    [clinicId]
                );
                return NextResponse.json({ data: result.rows });
            }

            case 'get_lead_consents': {
                const { lead_id } = body.data || body;
                if (!lead_id || typeof lead_id !== 'string') {
                    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
                }
                // Solo consentimientos de leads de la clínica activa; sin ip_hash ni user agent.
                const result = await db.query(
                    `SELECT c.kind, c.granted, c.text, c.version, c.created_at
                     FROM lead_consents c
                     JOIN leads l ON l.id = c.lead_id
                     WHERE c.lead_id = $1 AND l.clinic_id = $2
                     ORDER BY c.created_at ASC`,
                    [lead_id, clinicId]
                );
                return NextResponse.json({ data: result.rows });
            }

            case 'update_lead_status': {
                const { lead_id, status } = body.data || body;
                if (!lead_id || !LEAD_STATUSES.includes(status)) {
                    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
                }
                const result = await db.query(
                    'UPDATE leads SET status = $1 WHERE id = $2 AND clinic_id = $3',
                    [status, lead_id, clinicId]
                );
                if (result.rowCount === 0) {
                    return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
                }
                return NextResponse.json({ success: true });
            }

            // ── Derechos del paciente ──────────────────────────────────────
            case 'export_lead_data': {
                const { lead_id } = body.data || body;
                if (typeof lead_id !== 'string' || !UUID_RE.test(lead_id)) {
                    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
                }
                const data = await exportLeadData(lead_id, clinicId);
                if (!data) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
                return NextResponse.json({ data });
            }

            case 'erase_lead': {
                const { lead_id } = body.data || body;
                if (typeof lead_id !== 'string' || !UUID_RE.test(lead_id)) {
                    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
                }
                const result = await eraseLeadForClinic(lead_id, clinicId, ctx.userId);
                if (!result) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
                return NextResponse.json({ success: true, result });
            }

            // ── Retención y baja de la clínica ─────────────────────────────
            case 'get_retention_settings': {
                const row = await db.queryOne(
                    `SELECT retention_photos_days, retention_leads_days, deletion_requested_at
                     FROM clinics WHERE id = $1`,
                    [clinicId]
                );
                return NextResponse.json({
                    data: {
                        photos_days: row?.retention_photos_days ?? RETENTION_LIMITS.photos.default,
                        leads_days: row?.retention_leads_days ?? RETENTION_LIMITS.leads.default,
                        deletion_requested_at: row?.deletion_requested_at ?? null,
                        deletion_scheduled_for: row?.deletion_requested_at ? clinicDeletionDate(row.deletion_requested_at).toISOString() : null,
                        limits: RETENTION_LIMITS,
                    },
                });
            }

            case 'update_retention_settings': {
                const { photos_days, leads_days } = body.data || body;
                if (!isValidRetention('photos', photos_days) || !isValidRetention('leads', leads_days)) {
                    return NextResponse.json({ error: 'Plazos fuera de los rangos permitidos.' }, { status: 400 });
                }
                await db.query(
                    'UPDATE clinics SET retention_photos_days = $1, retention_leads_days = $2 WHERE id = $3',
                    [photos_days, leads_days, clinicId]
                );
                await db.query('INSERT INTO audit_logs (action, details, user_id) VALUES ($1, $2, $3)', [
                    'RETENTION_SETTINGS_UPDATED',
                    JSON.stringify({ clinic_id: clinicId, photos_days, leads_days }),
                    ctx.userId,
                ]);
                return NextResponse.json({ success: true });
            }

            case 'request_clinic_deletion': {
                const { confirm_name } = body.data || body;
                if (typeof confirm_name !== 'string' || confirm_name.trim() !== ctx.clinic.name.trim()) {
                    return NextResponse.json({ error: 'El nombre no coincide con el de la clínica.' }, { status: 400 });
                }
                const row = await db.queryOne<{ deletion_requested_at: string }>(
                    `UPDATE clinics SET deletion_requested_at = COALESCE(deletion_requested_at, now()), deletion_requested_by = COALESCE(deletion_requested_by, $2)
                     WHERE id = $1 RETURNING deletion_requested_at`,
                    [clinicId, ctx.userId]
                );
                await db.query('INSERT INTO audit_logs (action, details, user_id) VALUES ($1, $2, $3)', [
                    'CLINIC_DELETION_REQUESTED', JSON.stringify({ clinic_id: clinicId }), ctx.userId,
                ]);
                return NextResponse.json({
                    success: true,
                    deletion_scheduled_for: row ? clinicDeletionDate(row.deletion_requested_at).toISOString() : null,
                });
            }

            case 'cancel_clinic_deletion': {
                await db.query(
                    'UPDATE clinics SET deletion_requested_at = NULL, deletion_requested_by = NULL WHERE id = $1',
                    [clinicId]
                );
                await db.query('INSERT INTO audit_logs (action, details, user_id) VALUES ($1, $2, $3)', [
                    'CLINIC_DELETION_CANCELLED', JSON.stringify({ clinic_id: clinicId }), ctx.userId,
                ]);
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (err: any) {
        console.error('[api/admin] Error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
