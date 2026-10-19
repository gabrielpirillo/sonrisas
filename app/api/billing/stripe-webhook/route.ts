/**
 * Webhook de Stripe → acredita compras de créditos.
 *
 * - Verifica la firma con STRIPE_WEBHOOK_SECRET sobre el cuerpo crudo.
 * - Ignora eventos ya procesados (tabla stripe_events) y responde 200 a los
 *   que no maneja, para que Stripe no reintente.
 * - No confía en metadata: re-lee la sesión en Stripe y valida importe y moneda
 *   contra credit_purchases (ver lib/billing/purchases.ts).
 * - Nunca devuelve detalles internos en la respuesta.
 */
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { db } from '@/lib/db';
import { getStripe } from '@/lib/billing/stripe';
import { fulfillCheckoutSession, handleChargeRefunded } from '@/lib/billing/purchases';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY = 512 * 1024;

export async function POST(req: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }
    const signature = req.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY) return NextResponse.json({ error: 'too_large' }, { status: 413 });

    let event: Stripe.Event;
    try {
        // Tolerancia por defecto de 5 min contra repeticiones.
        event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
        console.warn('[stripe-webhook] Firma inválida');
        return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }

    // Deduplicación por id de evento.
    const fresh = await db.queryOne<{ id: string }>(
        'INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id',
        [event.id, event.type]
    );
    if (!fresh) return NextResponse.json({ received: true, duplicate: true });

    try {
        switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
                const session = event.data.object as Stripe.Checkout.Session;
                const r = await fulfillCheckoutSession(session.id);
                console.log(`[stripe-webhook] ${event.type} ${session.id} → ${r.state}${r.state === 'paid' && r.credited ? ' (acreditado)' : ''}`);
                break;
            }
            case 'checkout.session.expired':
            case 'checkout.session.async_payment_failed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await db.query(
                    `UPDATE credit_purchases SET status = $2, updated_at = now() WHERE stripe_session_id = $1 AND status = 'pending'`,
                    [session.id, event.type === 'checkout.session.expired' ? 'expired' : 'failed']
                );
                break;
            }
            case 'charge.refunded': {
                await handleChargeRefunded(event.data.object as Stripe.Charge);
                break;
            }
            default:
                break;
        }
        return NextResponse.json({ received: true });
    } catch (error) {
        // Permitir que Stripe reintente: quitamos la marca de procesado.
        await db.query('DELETE FROM stripe_events WHERE id = $1', [event.id]).catch(() => {});
        console.error('[stripe-webhook] Error procesando', event.type, error);
        return NextResponse.json({ error: 'processing_error' }, { status: 500 });
    }
}
