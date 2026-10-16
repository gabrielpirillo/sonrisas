/**
 * API Route: Create a Stripe Checkout session to buy a credit package.
 *
 * Admin-only. Returns a Checkout URL; on payment completion the Stripe webhook
 * (/api/billing/stripe-webhook) tops up the clinic's credit wallet.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { getStripe, getPackage, stripeEnabled } from '@/lib/billing/stripe';

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth('admin');

        if (!stripeEnabled()) {
            return NextResponse.json({ error: 'Stripe no está configurado' }, { status: 503 });
        }

        const { package_id, clinic_id } = await req.json();

        const pkg = getPackage(package_id);
        if (!pkg) {
            return NextResponse.json({ error: 'Paquete inválido' }, { status: 400 });
        }
        if (!pkg.priceId) {
            return NextResponse.json(
                { error: `Falta STRIPE_PRICE para el paquete "${pkg.id}"` },
                { status: 503 }
            );
        }

        // Resolve the clinic to bill: explicit clinic_id (admin) or the user's clinic.
        const clinic = await db.queryOne<{ id: string; name: string; stripe_customer_id: string | null }>(
            'SELECT id, name, stripe_customer_id FROM clinics WHERE id = COALESCE($1, (SELECT clinic_id FROM users WHERE id = $2))',
            [clinic_id || null, user.id]
        );
        if (!clinic) {
            return NextResponse.json({ error: 'Clínica no encontrada' }, { status: 404 });
        }

        const stripe = getStripe();

        // Reuse or create the Stripe customer for this clinic.
        let stripeCustomerId = clinic.stripe_customer_id;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                name: clinic.name,
                metadata: { clinic_id: clinic.id },
            });
            stripeCustomerId = customer.id;
            await db.query('UPDATE clinics SET stripe_customer_id = $1 WHERE id = $2', [stripeCustomerId, clinic.id]);
        }

        const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer: stripeCustomerId,
            line_items: [{ price: pkg.priceId, quantity: 1 }],
            // Metadata read back by the webhook to credit the right wallet.
            metadata: {
                clinic_id: clinic.id,
                package_id: pkg.id,
                credits: String(pkg.credits),
            },
            success_url: `${appUrl}/administracion/creditos?status=success`,
            cancel_url: `${appUrl}/administracion/creditos?status=cancel`,
        });

        return NextResponse.json({ url: session.url, session_id: session.id });
    } catch (error: any) {
        const status = /Unauthorized|Forbidden/.test(error.message) ? 401 : 500;
        console.error('[billing/checkout] Error:', error);
        return NextResponse.json({ error: error.message }, { status });
    }
}
