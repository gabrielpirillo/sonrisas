/**
 * API Route: Admin Data Queries
 * Replaces client-side Supabase queries for admin pages.
 * All queries require authentication context (via cookies/session).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { getSession } from '@/lib/auth/session';
import { isImpersonating } from '@/lib/auth/context';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body;

        // Impersonación = solo lectura: bloquea exportaciones y escrituras.
        const BLOCKED_WHEN_IMPERSONATING = ['get_generations', 'update_password'];
        if (BLOCKED_WHEN_IMPERSONATING.includes(action) && (await isImpersonating())) {
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
                     GROUP BY l.id
                     ORDER BY l.created_at DESC`
                );
                return NextResponse.json({ data: result.rows });
            }

            case 'get_generations': {
                const result = await db.query(
                    'SELECT * FROM generations ORDER BY created_at DESC'
                );
                return NextResponse.json({ data: result.rows });
            }

            case 'get_dashboard_stats': {
                const [leads, images, videos] = await Promise.all([
                    db.queryOne('SELECT COUNT(*) as count FROM leads'),
                    db.queryOne("SELECT COUNT(*) as count FROM generations WHERE type = 'image'"),
                    db.queryOne("SELECT COUNT(*) as count FROM generations WHERE type = 'video'"),
                ]);

                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const chartResult = await db.query(
                    `SELECT created_at, type FROM generations 
                     WHERE created_at >= $1 ORDER BY created_at ASC`,
                    [thirtyDaysAgo.toISOString()]
                );

                const activityResult = await db.query(
                    'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5'
                );

                return NextResponse.json({
                    totalLeads: parseInt(leads?.count || '0'),
                    smileGenerations: parseInt(images?.count || '0'),
                    videoRequests: parseInt(videos?.count || '0'),
                    chartData: chartResult.rows,
                    recentActivity: activityResult.rows,
                });
            }

            case 'get_user_role': {
                const { user_id } = body;
                const result = await db.queryOne(
                    'SELECT role FROM user_roles WHERE user_id = $1',
                    [user_id]
                );
                return NextResponse.json({ role: result?.role || null });
            }

            case 'update_password': {
                // Legacy: la gestión de contraseña migró a Better Auth.
                const session = await getSession();
                if (!session) {
                    return NextResponse.json({ error: 'No hay sesión activa' }, { status: 401 });
                }
                return NextResponse.json(
                    { error: 'El cambio de contraseña ahora se gestiona desde el panel (Better Auth).' },
                    { status: 410 }
                );
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[api/admin] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

