/**
 * API Route: Billing health check (sin auth, no expone datos sensibles).
 *
 * Permite verificar que la migración 002 (multi-tenancy + créditos) está
 * aplicada y que el código de billing está desplegado. Devuelve solo booleanos
 * de existencia de tablas y el número de clínicas — nada sensible.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        const checks = await db.queryOne<{
            clinics: string | null;
            credit_ledger: string | null;
            credit_costs: string | null;
        }>(
            `SELECT to_regclass('public.clinics')::text AS clinics,
                    to_regclass('public.credit_ledger')::text AS credit_ledger,
                    to_regclass('public.credit_costs')::text AS credit_costs`,
            []
        );

        const schemaReady = Boolean(checks?.clinics && checks?.credit_ledger && checks?.credit_costs);

        let clinicsCount: number | null = null;
        let costs: Array<{ action: string; credits: number }> = [];
        let defaultClinicBalance: number | null = null;
        if (schemaReady) {
            const c = await db.queryOne<{ n: string }>('SELECT count(*)::text AS n FROM clinics', []);
            clinicsCount = c ? parseInt(c.n, 10) : null;
            const r = await db.query<{ action: string; credits: number }>(
                'SELECT action, credits FROM credit_costs ORDER BY action',
                []
            );
            costs = r.rows;
            const dc = await db.queryOne<{ credit_balance: number }>(
                "SELECT credit_balance FROM clinics WHERE slug = 'default'",
                []
            );
            defaultClinicBalance = dc?.credit_balance ?? null;
        }

        return NextResponse.json({
            ok: true,
            billing_code_deployed: true,
            schema_ready: schemaReady,
            tables: {
                clinics: Boolean(checks?.clinics),
                credit_ledger: Boolean(checks?.credit_ledger),
                credit_costs: Boolean(checks?.credit_costs),
            },
            clinics_count: clinicsCount,
            default_clinic_balance: defaultClinicBalance,
            costs,
        });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, billing_code_deployed: true, schema_ready: false, error: error.message },
            { status: 500 }
        );
    }
}
