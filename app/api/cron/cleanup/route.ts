/**
 * API Route: job de retención de datos (lib/retention.ts).
 *
 * Borra selfies originales con más de 24 h, simulaciones y leads fuera del
 * plazo de cada clínica y las clínicas cuya baja venció. También se ejecuta
 * solo cada 6 h desde instrumentation.ts; esta ruta permite lanzarlo a mano o
 * desde un cron externo.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>. Sin secreto configurado, cerrado.
 */
import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { runRetention } from '@/lib/retention';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
    const expectedToken = process.env.CRON_SECRET || process.env.API_SECRET;
    if (!expectedToken) return false;
    const got = Buffer.from(req.headers.get('Authorization') || '');
    const want = Buffer.from(`Bearer ${expectedToken}`);
    return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: NextRequest) {
    if (!authorized(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const report = await runRetention();
        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error('[cron/cleanup] Error en la retención:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
