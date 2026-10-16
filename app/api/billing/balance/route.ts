/**
 * API Route: Read a clinic's credit balance, cost table and packages.
 * Admin-only — powers the credits dashboard.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { CREDIT_PACKAGES } from '@/lib/billing/stripe';

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth('admin');

        const clinicId = req.nextUrl.searchParams.get('clinic_id');

        const clinic = await db.queryOne<{ id: string; name: string; credit_balance: number; public_widget_key: string }>(
            `SELECT id, name, credit_balance, public_widget_key FROM clinics
             WHERE id = COALESCE($1, (SELECT clinic_id FROM users WHERE id = $2))`,
            [clinicId || null, user.id]
        );
        if (!clinic) {
            return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 });
        }

        const costs = await db.query<{ action: string; credits: number }>(
            'SELECT action, credits FROM credit_costs ORDER BY action',
            []
        );

        const ledger = await db.query(
            `SELECT created_at, action, kind, credits_delta, balance_after, generation_id
             FROM credit_ledger WHERE clinic_id = $1
             ORDER BY created_at DESC LIMIT 50`,
            [clinic.id]
        );

        return NextResponse.json({
            clinic: {
                id: clinic.id,
                name: clinic.name,
                credit_balance: clinic.credit_balance,
                public_widget_key: clinic.public_widget_key,
            },
            costs: costs.rows,
            packages: CREDIT_PACKAGES.map((p) => ({ id: p.id, label: p.label, credits: p.credits, available: Boolean(p.priceId) })),
            recent_ledger: ledger.rows,
        });
    } catch (error: any) {
        const status = /Unauthorized|Forbidden/.test(error.message) ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}
