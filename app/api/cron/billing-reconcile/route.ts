/**
 * API Route: conciliación de compras de créditos con Stripe.
 *
 * Red de seguridad por si un webhook no llegó o falló: vuelve a consultar en
 * Stripe las compras `pending` con sesión de Checkout de entre 10 min y 3 días
 * de antigüedad. fulfillCheckoutSession es idempotente: acredita las pagadas,
 * marca `expired` las sesiones caducadas y deja el resto como están.
 *
 * Llamar desde un cron con `Authorization: Bearer $CRON_SECRET`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { stripeEnabled } from '@/lib/billing/stripe';
import { reconcilePendingPurchases } from '@/lib/billing/reconcile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    const expectedToken = process.env.CRON_SECRET || process.env.API_SECRET;
    // Sin secreto configurado, el cron queda cerrado.
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!stripeEnabled()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

    const r = await reconcilePendingPurchases();
    return NextResponse.json(r);
}

export const POST = handle;
export const GET = handle;
