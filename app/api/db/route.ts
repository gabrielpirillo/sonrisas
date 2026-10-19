/**
 * API pública del widget (lado paciente).
 * Solo operaciones que el flujo del widget necesita, con límites:
 * - el lead se asigna a la clínica de la clave pública del widget;
 * - las escrituras posteriores solo valen sobre leads recién creados;
 * - límite por IP para evitar abuso.
 * Las acciones de gestión (estado del lead, etc.) viven en /api/admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveClinic } from '@/lib/billing/credits';
import { ipFromRequest, rateLimit } from '@/lib/security';
import { normalizeWidgetConfig, validateCustomAnswers } from '@/lib/widgetConfig';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ventana en la que el widget puede seguir escribiendo sobre su propio lead. */
const LEAD_WRITE_WINDOW = "interval '6 hours'";

const json = (body: unknown, status = 200) =>
    NextResponse.json(body, { headers: corsHeaders, status });

export async function OPTIONS() {
    return new NextResponse('ok', { headers: corsHeaders, status: 200 });
}

/** True si el lead existe y fue creado hace poco (sesión del widget). */
async function isRecentLead(leadId: string): Promise<boolean> {
    if (!UUID_RE.test(leadId || '')) return false;
    const row = await db.queryOne(
        `SELECT 1 FROM leads WHERE id = $1 AND created_at > now() - ${LEAD_WRITE_WINDOW}`,
        [leadId]
    );
    return Boolean(row);
}

export async function POST(req: NextRequest) {
    const ip = ipFromRequest(req);
    if (!rateLimit(`db:${ip}`, 60, 10 * 60_000)) {
        return json({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' }, 429);
    }

    try {
        const body = await req.json();
        const { action, data = {} } = body;

        switch (action) {
            case 'insert_lead': {
                if (!rateLimit(`lead:${ip}`, 10, 60 * 60_000)) {
                    return json({ error: 'Demasiadas solicitudes. Inténtalo más tarde.' }, 429);
                }
                const { id, name, email, phone, clinic_key, custom_answers } = data;
                if (!UUID_RE.test(id || '') || !name || !EMAIL_RE.test(email || '')) {
                    return json({ error: 'Datos del lead inválidos' }, 400);
                }
                const clinic = await resolveClinic(clinic_key);
                if (!clinic) return json({ error: 'Clínica no encontrada' }, 404);
                if (clinic.status === 'suspended') {
                    return json({ error: 'Clínica suspendida', code: 'CLINIC_SUSPENDED' }, 403);
                }
                // Campos adicionales: solo los que la clínica tiene configurados.
                const fields = normalizeWidgetConfig((clinic as { widget_config?: unknown }).widget_config).customFields;
                const custom = validateCustomAnswers(fields, custom_answers);
                if (!custom.ok) return json({ error: custom.error }, 400);
                await db.query(
                    `INSERT INTO leads (id, name, email, phone, status, clinic_id, custom_data)
                     VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
                    [id, String(name).slice(0, 200), String(email).slice(0, 200), String(phone || '').slice(0, 40), clinic.id, JSON.stringify(custom.answers)]
                );
                return json({ success: true });
            }

            case 'insert_generation': {
                const { lead_id, type, status, input_path, output_path, metadata } = data;
                if (!(await isRecentLead(lead_id)) || !['image', 'video'].includes(type)) {
                    return json({ error: 'Operación no permitida' }, 403);
                }
                await db.query(
                    `INSERT INTO generations (lead_id, clinic_id, type, status, input_path, output_path, metadata)
                     SELECT $1, l.clinic_id, $2, $3, $4, $5, $6 FROM leads l WHERE l.id = $1`,
                    [lead_id, type, status, input_path, output_path, JSON.stringify(metadata || {})]
                );
                return json({ success: true });
            }

            case 'update_lead_survey': {
                const { lead_id, survey_data } = data;
                if (!(await isRecentLead(lead_id))) {
                    return json({ error: 'Operación no permitida' }, 403);
                }
                await db.query('UPDATE leads SET survey_data = $1 WHERE id = $2', [
                    JSON.stringify(survey_data ?? null),
                    lead_id,
                ]);
                return json({ success: true });
            }

            case 'get_selfie_session': {
                const { session_id } = data;
                if (!UUID_RE.test(session_id || '')) return json({ error: 'Sesión inválida' }, 400);
                const result = await db.queryOne('SELECT * FROM selfie_sessions WHERE id = $1', [session_id]);
                return json({ success: true, data: result });
            }

            default:
                return json({ error: 'Unknown action' }, 400);
        }
    } catch (error: any) {
        console.error('[api/db] Error:', error);
        return json({ error: 'Error interno' }, 500);
    }
}
