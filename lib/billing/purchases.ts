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
import { createHash } from 'crypto';
import type Stripe from 'stripe';
import { db } from '@/lib/db';
import { customerColumn, getStripe, stripeMode } from '@/lib/billing/stripe';
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
    /** review = Stripe cobró pero no coincide con lo registrado: no se acredita, se revisa a mano. */
    status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded' | 'review';
    status_reason?: string | null;
    amount_refunded_cents?: number;
    stripe_session_id: string | null;
    stripe_payment_intent: string | null;
    receipt_url: string | null;
    paid_at: string | null;
}

export type FulfillResult =
    | { state: 'paid'; purchase: PurchaseRow; credited: boolean }
    | { state: 'pending' | 'expired' | 'failed' | 'review' | 'unknown'; purchase?: PurchaseRow };

/**
 * Customer de Stripe de la clínica para el modo de la clave actual (live/test).
 * Serializado por clínica (advisory lock) para no crear duplicados si hay dos
 * compras a la vez. `replace` = id que Stripe ya no reconoce (resource_missing):
 * se descarta y se crea otro.
 */
export async function ensureStripeCustomer(params: {
    clinicId: string;
    name: string;
    email?: string | null;
    replace?: string | null;
}): Promise<string> {
    const mode = stripeMode() === 'test' ? 'test' : 'live';
    const col = customerColumn();
    return db.transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`stripe-customer:${params.clinicId}`]);
        if (params.replace) {
            await client.query(`UPDATE clinics SET ${col} = NULL WHERE id = $1 AND ${col} = $2`, [params.clinicId, params.replace]);
        }
        const row = await client.query<{ id: string | null }>(`SELECT ${col} AS id FROM clinics WHERE id = $1`, [params.clinicId]);
        if (row.rows[0]?.id) return row.rows[0].id;

        const body: Stripe.CustomerCreateParams = {
            name: params.name,
            email: params.email || undefined,
            metadata: { clinic_id: params.clinicId },
        };
        const hash = createHash('sha256').update(JSON.stringify([body, params.replace ?? null])).digest('hex').slice(0, 12);
        const customer = await getStripe().customers.create(body, { idempotencyKey: `customer:${mode}:${params.clinicId}:${hash}` });
        await client.query(`UPDATE clinics SET ${col} = $1 WHERE id = $2`, [customer.id, params.clinicId]);
        return customer.id;
    });
}

/** Lee la sesión en Stripe (fuente de verdad) y, si está pagada, acredita la compra. */
export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillResult> {
    if (typeof sessionId !== 'string' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return { state: 'unknown' };

    const purchase = await db.queryOne<PurchaseRow>('SELECT * FROM credit_purchases WHERE stripe_session_id = $1', [sessionId]);
    if (!purchase) return { state: 'unknown' };
    if (purchase.status === 'paid' || purchase.status === 'refunded') {
        return purchase.status === 'paid' ? { state: 'paid', purchase, credited: false } : { state: 'failed', purchase };
    }
    if (purchase.status === 'review') return { state: 'review', purchase };

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
        const reason = !sameRef ? 'reference_mismatch' : 'amount_mismatch';
        // Cobrado pero no coincide: no se acredita y queda para revisión manual.
        console.error('[billing:REVIEW] Pago cobrado que no coincide con la compra; NO se acredita, revisar a mano', {
            reason, purchase: purchase.id, clinic: purchase.clinic_id, session: session.id,
            expected: { amount: purchase.amount_cents, currency: purchase.currency },
            charged: { amount: session.amount_total, currency: session.currency },
            client_reference_id: session.client_reference_id, metadata_purchase_id: session.metadata?.purchase_id ?? null,
        });
        const updated = await db.queryOne<PurchaseRow>(
            `UPDATE credit_purchases SET status = 'review', status_reason = $2, updated_at = now()
             WHERE id = $1 AND status IN ('pending', 'expired', 'failed') RETURNING *`,
            [purchase.id, reason]
        );
        return { state: 'review', purchase: updated ?? purchase };
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

/** Motivos del ledger que descuentan/devuelven créditos de una compra por Stripe. */
const CLAWBACK_REASONS = ['stripe_refund', 'stripe_refund_reversal', 'stripe_dispute'];

const piIdOf = (pi: string | Stripe.PaymentIntent | null | undefined) => (typeof pi === 'string' ? pi : pi?.id ?? null);

/** Compra a partir del PaymentIntent (o, si no viene, del cargo). */
async function purchaseForPayment(pi: string | Stripe.PaymentIntent | null | undefined, charge: string | Stripe.Charge | null | undefined): Promise<PurchaseRow | null> {
    let piId = piIdOf(pi);
    if (!piId && charge) {
        const ch = typeof charge === 'string' ? await getStripe().charges.retrieve(charge) : charge;
        piId = piIdOf(ch.payment_intent);
    }
    if (!piId) return null;
    return db.queryOne<PurchaseRow>('SELECT * FROM credit_purchases WHERE stripe_payment_intent = $1', [piId]);
}

/** Créditos ya descontados (neto) por reembolsos/disputas de una compra. */
async function netClawedBack(client: import('pg').PoolClient, purchase: PurchaseRow, reasons = CLAWBACK_REASONS): Promise<number> {
    const r = await client.query<{ removed: number }>(
        `SELECT COALESCE(-SUM(credits_delta), 0)::int AS removed FROM credit_ledger
         WHERE clinic_id = $1 AND kind = 'adjust' AND metadata->>'purchase_id' = $2 AND metadata->>'reason' = ANY($3)`,
        [purchase.clinic_id, purchase.id, reasons]
    );
    return r.rows[0]?.removed ?? 0;
}

/**
 * Descuenta hasta `toRemove` créditos sin dejar el saldo en negativo y lo
 * registra en el ledger. Devuelve lo que realmente se descontó.
 */
async function clawBack(client: import('pg').PoolClient, purchase: PurchaseRow, toRemove: number, key: string, meta: Record<string, unknown>): Promise<number> {
    const bal = await client.query<{ credit_balance: number }>('SELECT credit_balance FROM clinics WHERE id = $1 FOR UPDATE', [purchase.clinic_id]);
    const removable = Math.min(toRemove, bal.rows[0]?.credit_balance ?? 0);
    if (removable <= 0) return 0;
    const r = await client.query<{ debit_credits: number | null }>('SELECT public.debit_credits($1, $2) AS debit_credits', [purchase.clinic_id, removable]);
    await client.query(
        `INSERT INTO credit_ledger (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, metadata)
         VALUES ($1, 'refund', 'adjust', $2, $3, $4, $5)`,
        [purchase.clinic_id, -removable, r.rows[0]?.debit_credits ?? 0, key,
         JSON.stringify({ ...meta, purchase_id: purchase.id, uncovered: toRemove - removable })]
    );
    return removable;
}

/**
 * Reembolso (total o parcial) hecho desde Stripe: descuenta la parte
 * proporcional de créditos, sin dejar el saldo en negativo. Idempotente por el
 * importe reembolsado acumulado.
 */
export async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const piId = piIdOf(charge.payment_intent);
    if (!piId) return;
    const purchase = await db.queryOne<PurchaseRow>('SELECT * FROM credit_purchases WHERE stripe_payment_intent = $1', [piId]);
    if (!purchase || purchase.status !== 'paid' && purchase.status !== 'refunded') return;

    const fraction = Math.min(1, charge.amount_refunded / Math.max(1, purchase.amount_cents));
    const shouldRemoveTotal = Math.round(purchase.credits * fraction);

    await db.transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`refund:${purchase.id}`]);
        await client.query(
            'UPDATE credit_purchases SET amount_refunded_cents = LEAST(amount_cents, $2), updated_at = now() WHERE id = $1',
            [purchase.id, charge.amount_refunded]
        );
        if (fraction >= 1) {
            await client.query("UPDATE credit_purchases SET status = 'refunded', updated_at = now() WHERE id = $1", [purchase.id]);
        }
        const key = `stripe-refund:${charge.id}:${charge.amount_refunded}`;
        const dup = await client.query('SELECT 1 FROM credit_ledger WHERE idempotency_key = $1', [key]);
        if (dup.rows.length > 0) return;
        const toRemoveNow = shouldRemoveTotal - (await netClawedBack(client, purchase));
        if (toRemoveNow <= 0) return;
        await clawBack(client, purchase, toRemoveNow, key, { reason: 'stripe_refund', charge: charge.id });
    });
}

/**
 * Reembolso que Stripe no pudo completar (failed/canceled): devuelve los
 * créditos que ese reembolso había descontado. Idempotente por id de reembolso.
 */
export async function handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
    if (refund.status !== 'failed' && refund.status !== 'canceled') return;
    const purchase = await purchaseForPayment(refund.payment_intent, refund.charge);
    if (!purchase) return;

    await db.transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`refund:${purchase.id}`]);
        const key = `stripe-refund-reversal:${refund.id}`;
        const dup = await client.query('SELECT 1 FROM credit_ledger WHERE idempotency_key = $1', [key]);
        if (dup.rows.length > 0) return;

        await client.query(
            `UPDATE credit_purchases SET amount_refunded_cents = GREATEST(0, amount_refunded_cents - $2),
                 status = CASE WHEN status = 'refunded' THEN 'paid' ELSE status END, updated_at = now()
             WHERE id = $1`,
            [purchase.id, refund.amount]
        );
        // Lo que descontó ese reembolso (proporcional), sin devolver más de lo descontado por reembolsos.
        const proportional = Math.round(purchase.credits * Math.min(1, refund.amount / Math.max(1, purchase.amount_cents)));
        const back = Math.max(0, Math.min(proportional, await netClawedBack(client, purchase, ['stripe_refund', 'stripe_refund_reversal'])));
        // Se registra aunque sea 0 para que la clave idempotente cubra también el ajuste de importe de arriba.
        const r = await client.query<{ credit_credits: number }>('SELECT public.credit_credits($1, $2) AS credit_credits', [purchase.clinic_id, back]);
        await client.query(
            `INSERT INTO credit_ledger (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, metadata)
             VALUES ($1, 'refund', 'adjust', $2, $3, $4, $5)`,
            [purchase.clinic_id, back, r.rows[0]?.credit_credits ?? 0, key,
             JSON.stringify({ reason: 'stripe_refund_reversal', purchase_id: purchase.id, refund: refund.id, refund_status: refund.status })]
        );
    });
}

/**
 * Disputa (contracargo) abierta: se descuentan los créditos de la compra como
 * en un reembolso total (lo que quede tras reembolsos previos), sin dejar el
 * saldo en negativo. Idempotente por id de disputa.
 */
export async function handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    const purchase = await purchaseForPayment(dispute.payment_intent, dispute.charge);
    if (!purchase || purchase.status !== 'paid' && purchase.status !== 'refunded') return;

    await db.transaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`refund:${purchase.id}`]);
        const key = `stripe-dispute:${dispute.id}`;
        const dup = await client.query('SELECT 1 FROM credit_ledger WHERE idempotency_key = $1', [key]);
        if (dup.rows.length > 0) return;
        const toRemoveNow = purchase.credits - (await netClawedBack(client, purchase));
        const removed = toRemoveNow > 0
            ? await clawBack(client, purchase, toRemoveNow, key, { reason: 'stripe_dispute', dispute: dispute.id, dispute_reason: dispute.reason })
            : 0;
        console.warn(`[billing] Disputa ${dispute.id} en la compra ${purchase.id}: ${removed} créditos descontados${toRemoveNow > removed ? ` (${toRemoveNow - removed} sin saldo para cubrir)` : ''}`);
    });
}
