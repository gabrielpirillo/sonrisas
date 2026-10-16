/**
 * API Route: Stripe webhook → credit a clinic's wallet after payment.
 *
 * Verifies the Stripe signature, then on `checkout.session.completed` tops up
 * the clinic's prepaid credit balance (idempotent via the session id) and
 * mirrors the top-up into Flexprice.
 *
 * Configure the endpoint in Stripe pointing to /api/billing/stripe-webhook and
 * set STRIPE_WEBHOOK_SECRET. The raw body is required for signature checks.
 */
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/billing/stripe';
import { topUp } from '@/lib/billing/credits';

// Stripe needs the raw, unparsed body to verify signatures.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Falta firma' }, { status: 400 });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
        console.error('[stripe-webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;

            if (session.payment_status === 'paid') {
                const clinicId = session.metadata?.clinic_id;
                const credits = parseInt(session.metadata?.credits || '0', 10);

                if (clinicId && credits > 0) {
                    const result = await topUp({
                        clinicId,
                        credits,
                        stripeSessionId: session.id,
                        metadata: {
                            package_id: session.metadata?.package_id,
                            amount_total: session.amount_total,
                            currency: session.currency,
                        },
                    });
                    console.log(
                        `[stripe-webhook] Top-up ${result.applied ? 'applied' : 'skipped (duplicate)'} ` +
                        `clinic=${clinicId} +${credits} → balance=${result.balanceAfter}`
                    );
                } else {
                    console.warn('[stripe-webhook] Missing clinic_id/credits in session metadata', session.metadata);
                }
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[stripe-webhook] Handler error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
