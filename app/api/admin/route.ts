/**
 * API Route: consultas del panel de la clínica.
 * Exige sesión y filtra todo por la clínica activa del usuario.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireClinic } from '@/lib/security';

const LEAD_STATUSES = ['pending', 'contacted', 'converted', 'rejected'];

export async function POST(req: NextRequest) {
    const { ctx, error } = await requireClinic();
    if (error) return error;
    const clinicId = ctx.clinic.id;

    try {
        const body = await req.json();
        const { action } = body;

        // Impersonación = solo lectura: bloquea exportaciones y escrituras.
        const BLOCKED_WHEN_IMPERSONATING = ['get_generations', 'update_lead_status'];
        if (BLOCKED_WHEN_IMPERSONATING.includes(action) && ctx.impersonatedBy) {
            return NextResponse.json(
                { error: 'No disponible durante una impersonación (solo lectura).' },
                { status: 403 }
            );
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

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (err: any) {
        console.error('[api/admin] Error:', err);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
