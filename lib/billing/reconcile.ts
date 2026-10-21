/** Conciliación de compras pendientes con Stripe (ver app/api/cron/billing-reconcile). Solo servidor. */
import { db } from '@/lib/db';
import { stripeEnabled } from '@/lib/billing/stripe';
import { fulfillCheckoutSession } from '@/lib/billing/purchases';

const BATCH = 100;

export async function reconcilePendingPurchases(): Promise<{ checked: number; states: Record<string, number>; credited: number; errors: number }> {
    if (!stripeEnabled()) return { checked: 0, states: {}, credited: 0, errors: 0 };
    const pending = await db.query<{ id: string; stripe_session_id: string }>(
        `SELECT id, stripe_session_id FROM credit_purchases
         WHERE status = 'pending' AND stripe_session_id IS NOT NULL
           AND created_at < now() - interval '10 minutes'
           AND created_at > now() - interval '3 days'
         ORDER BY created_at ASC LIMIT ${BATCH}`,
        []
    );

    const counts: Record<string, number> = {};
    let credited = 0;
    let errors = 0;
    for (const row of pending.rows) {
        try {
            const r = await fulfillCheckoutSession(row.stripe_session_id);
            counts[r.state] = (counts[r.state] ?? 0) + 1;
            if (r.state === 'paid' && r.credited) credited += 1;
        } catch (e) {
            errors += 1;
            console.error('[billing-reconcile] Error con la compra', row.id, e);
        }
    }

    if (pending.rows.length > 0) {
        console.log(`[billing-reconcile] revisadas ${pending.rows.length}: ${JSON.stringify(counts)}, acreditadas ${credited}, errores ${errors}`);
    }
    return { checked: pending.rows.length, states: counts, credited, errors };
}
