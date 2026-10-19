/**
 * Compras de créditos con Stripe Checkout. Solo servidor.
 *
 * Reglas de seguridad:
 * - El importe y los créditos salen de credit_purchases (creado en el servidor
 *   antes del pago), nunca de metadata ni del navegador.
 * - Solo se acredita si Stripe confirma `paid` y el importe y la moneda cobrados
 *   coinciden exactamente con lo registrado.
 * - Todo es idempotente: el webhook y la página de confirmación pueden llamar a
 *   `fulfillCheckoutSession` a la vez o varias veces sin duplicar créditos.
 */
import type Stripe from 'stripe';
import { db } from '@/lib/db';
import { getStripe } from '@/lib/billing/stripe';
import { topUp } from '@/lib/billing/credits';

export interface PurchaseRow {
    id: string;
    created_at: string;
    clinic_id: string;
    package_id: string;
    package_name: string;
    credits: number;
    amount_cents: number;
    currency: string;
    status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';
    stripe_session_id: string | null;
    stripe_payment_intent: string | null;
    receipt_url: string | null;
    paid_at: string | null;
}

export type FulfillResult =
    | { state: 'paid'; purchase: PurchaseRow; credited: boolean }
    | { state: 'pending' | 'expired' | 'failed' | 'unknown'; purchase?: PurchaseRow };

/** Lee la sesión en Stripe (fuente de verdad) y, si está pagada, acredita la compra. */
export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillResult> {
    if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return { state: 'unknown' };

    const purchase = await db.queryOne<PurchaseRow>('SELECT * FROM credit_purchases WHERE stripe_session_id = $1', [sessionId]);
    if (!purchase) return { state: 'unknown' };
    if (purchase.status === 'paid' || purchase.status === 'refunded') {
        return purchase.status === 'paid' ? { state: 'paid', purchase, credited: false } : { state: 'failed', purchase };
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent.latest_charge'],
    });

    if (session.status === 'expired') {
        await db.query("UPDATE credit_purchases SET status = 'expired', updated_at = now() WHERE id = $1 AND status = 'pending'", [purchase.id]);
        return { state: 'expired', purchase };
    }
    if (session.payment_status !== 'paid') return { state: 'pending', purchase };

    // Coherencia estricta entre lo cobrado y lo registrado.
    const sameRef = session.client_reference_id === purchase.id && session.metadata?.purchase_id === purchase.id;
    const sameAmount = session.amount_total === purchase.amount_cents && session.currency === purchase.currency;
    if (!sameRef || !sameAmount) {
        console.error('[purchases] Discrepancia en la sesión de Stripe; no se acredita', {
            purchase: purchase.id, session: session.id, amount: session.amount_total, currency: session.currency,
        });
        await db.query("UPDATE credit_purchases SET status = 'failed', updated_at = now() WHERE id = $1 AND status = 'pending'", [purchase.id]);
        return { state: 'failed', purchase };
    }

    const pi = session.payment_intent as Stripe.PaymentIntent | string | null;
    const piId = typeof pi === 'string' ? pi : pi?.id ?? null;
    const charge = typeof pi === 'object' && pi && typeof pi.latest_charge === 'object' ? (pi.latest_charge as Stripe.Charge) : null;

    let credited = false;
    try {
        const result = await topUp({
            clinicId: purchase.clinic_id,
            credits: purchase.credits,
            stripeSessionId: session.id,
            metadata: { purchase_id: purchase.id, package_id: purchase.package_id, amount_total: session.amount_total, currency: session.currency },
        });
        credited = result.applied;
    } catch (err: any) {
        // Otra llamada simultánea ya acreditó esta sesión (clave idempotente única).
        if (err?.code !== '23505') throw err;
    }

    const updated = await db.queryOne<PurchaseRow>(
        `UPDATE credit_purchases
         SET status = 'paid', paid_at = COALESCE(paid_at, now()), stripe_payment_intent = COALESCE($2, stripe_payment_intent),
             receipt_url = COALESCE($3, receipt_url), updated_at = now()
         WHERE id = $1 RETURNING *`,
        [purchase.id, piId, charge?.receipt_url ?? null]
    );
    return { state: 'paid', purchase: updated ?? purchase, credited };
}

/**
 * Reembolso (total o parcial) hecho desde Stripe: descuenta la parte
 * proporcional de créditos, sin dejar el saldo en negativo. Idempotente por el
 * importe reembolsado acumulado.
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    if (!piId) return;
    const purchase = await db.queryOne<PurchaseRow>('SELECT * FROM credit_purchases WHERE stripe_payment_intent = $1', [piId]);
    if (!purchase || purchase.status !== 'paid' && purchase.status !== 'refunded') return;

    const fraction = Math.min(1, charge.amount_refunded / Math.max(1, purchase.amount_cents));
    const shouldRemoveTotal = Math.round(purchase.credits * fraction);

    await db.transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`refund:${purchase.id}`]);
        const already = await client.query<{ removed: number }>(
            `SELECT COALESCE(-SUM(credits_delta), 0)::int AS removed FROM credit_ledger
             WHERE clinic_id = $1 AND kind = 'adjust' AND metadata->>'purchase_id' = $2 AND metadata->>'reason' = 'stripe_refund'`,
            [purchase.clinic_id, purchase.id]
        );
        const toRemoveNow = shouldRemoveTotal - (already.rows[0]?.removed ?? 0);
        if (toRemoveNow <= 0) return;

        const bal = await client.query<{ credit_balance: number }>('SELECT credit_balance FROM clinics WHERE id = $1 FOR UPDATE', [purchase.clinic_id]);
        const removable = Math.min(toRemoveNow, bal.rows[0]?.credit_balance ?? 0);
        if (removable > 0) {
            const r = await client.query<{ debit_credits: number | null }>('SELECT public.debit_credits($1, $2) AS debit_credits', [purchase.clinic_id, removable]);
            await client.query(
                `INSERT INTO credit_ledger (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, metadata)
                 VALUES ($1, 'refund', 'adjust', $2, $3, $4, $5)`,
                [purchase.clinic_id, -removable, r.rows[0]?.debit_credits ?? 0,
                 `stripe-refund:${charge.id}:${charge.amount_refunded}`,
                 JSON.stringify({ reason: 'stripe_refund', purchase_id: purchase.id, charge: charge.id, uncovered: toRemoveNow - removable })]
            );
        }
        if (fraction >= 1) {
            await client.query("UPDATE credit_purchases SET status = 'refunded', updated_at = now() WHERE id = $1", [purchase.id]);
        }
    });
}
