/**
 * Credit billing core.
 *
 * The local Postgres ledger is the AUTHORITATIVE source of truth for gating:
 * debits are atomic (a single guarded UPDATE) so concurrent generations can
 * never oversell. Flexprice receives metering events best-effort for invoicing
 * and reporting; if it is unreachable, gating still works.
 *
 * Lifecycle of a billable generation:
 *   1. reserve()  → atomically deduct credits when the generation starts.
 *                   Returns { ok:false, reason:'insufficient' } to block.
 *   2a. confirm() → on success, record the Flexprice usage event (the credits
 *                   were already deducted at reserve time).
 *   2b. refund()  → on failure, return the reserved credits.
 *
 * reserve/refund/confirm are idempotent via credit_ledger.idempotency_key.
 */
import { db } from '@/lib/db';
import {
    ensureCustomer,
    ensureWallet,
    ingestUsageEvent,
    topUpWallet,
    flexpriceEnabled,
} from './flexprice';

export type BillableAction = 'image' | 'video';

export interface Clinic {
    id: string;
    name: string;
    slug: string;
    public_widget_key: string;
    credit_balance: number;
    stripe_customer_id: string | null;
    flexprice_customer_id: string | null;
    flexprice_wallet_id: string | null;
    status: 'active' | 'suspended';
    billing_country?: string | null;
}

const FLEX_EVENT_NAME: Record<BillableAction, string> = {
    image: 'image_generation',
    video: 'video_generation',
};

/**
 * Resolve the clinic for a request. Falls back to the DEFAULT_CLINIC_KEY env
 * (or the 'default' clinic) so single-tenant / legacy callers keep working
 * without passing a key.
 */
export async function resolveClinic(widgetKey?: string | null): Promise<Clinic | null> {
    const key = widgetKey || process.env.DEFAULT_CLINIC_KEY || null;

    if (key) {
        // No filtramos por status aquí: devolvemos la clínica para que la ruta
        // pueda bloquear explícitamente si está suspendida.
        const byKey = await db.queryOne<Clinic>(
            'SELECT * FROM clinics WHERE public_widget_key = $1',
            [key]
        );
        if (byKey) return byKey;
    }

    // Last-resort fallback: the seeded default clinic.
    return db.queryOne<Clinic>("SELECT * FROM clinics WHERE slug = 'default'", []);
}

/** Resolve the billing clinic linked 1:1 to a Better Auth organization. */
export async function getClinicByOrg(orgId: string): Promise<Clinic | null> {
    return db.queryOne<Clinic>('SELECT * FROM clinics WHERE org_id = $1', [orgId]);
}

/** Configurable credit price for an action (defaults: image=1, video=4). */
export async function getCreditCost(action: BillableAction): Promise<number> {
    const row = await db.queryOne<{ credits: number }>(
        'SELECT credits FROM credit_costs WHERE action = $1',
        [action]
    );
    if (row) return row.credits;
    return action === 'video' ? 4 : 1;
}

export async function getBalance(clinicId: string): Promise<number> {
    const row = await db.queryOne<{ credit_balance: number }>(
        'SELECT credit_balance FROM clinics WHERE id = $1',
        [clinicId]
    );
    return row?.credit_balance ?? 0;
}

export interface ReserveResult {
    ok: boolean;
    reason?: 'insufficient' | 'clinic_inactive';
    balanceAfter?: number;
    cost?: number;
}

/**
 * Atomically reserve (deduct) credits for a generation. Idempotent: a repeated
 * call with the same idempotencyKey returns the already-applied result without
 * double-charging.
 */
export async function reserve(params: {
    clinicId: string;
    action: BillableAction;
    idempotencyKey: string;
    generationId?: string;
    metadata?: Record<string, unknown>;
}): Promise<ReserveResult> {
    const cost = await getCreditCost(params.action);

    return db.transaction(async (client) => {
        // Idempotency: if this reservation already happened, return it as-is.
        const existing = await client.query(
            'SELECT balance_after FROM credit_ledger WHERE idempotency_key = $1',
            [params.idempotencyKey]
        );
        if (existing.rows.length > 0) {
            return { ok: true, balanceAfter: existing.rows[0].balance_after, cost };
        }

        if (cost === 0) {
            return { ok: true, balanceAfter: await getBalanceTx(client, params.clinicId), cost };
        }

        // Atomic, race-safe debit. Returns NULL when balance is insufficient.
        const debit = await client.query<{ debit_credits: number | null }>(
            'SELECT public.debit_credits($1, $2) AS debit_credits',
            [params.clinicId, cost]
        );
        const balanceAfter = debit.rows[0]?.debit_credits;

        if (balanceAfter == null) {
            return { ok: false, reason: 'insufficient', cost };
        }

        await client.query(
            `INSERT INTO credit_ledger
                (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, generation_id, metadata)
             VALUES ($1, $2, 'reserve', $3, $4, $5, $6, $7)`,
            [
                params.clinicId,
                params.action,
                -cost,
                balanceAfter,
                params.idempotencyKey,
                params.generationId || null,
                JSON.stringify(params.metadata || {}),
            ]
        );

        return { ok: true, balanceAfter, cost };
    });
}

/**
 * Refund a previously reserved generation (on failure). Idempotent via
 * idempotencyKey; also no-ops if the matching reserve was never recorded.
 */
export async function refund(params: {
    clinicId: string;
    action: BillableAction;
    reserveKey: string; // the idempotencyKey used in reserve()
    generationId?: string;
    reason?: string;
}): Promise<void> {
    const refundKey = `refund:${params.reserveKey}`;

    await db.transaction(async (client) => {
        // Already refunded?
        const already = await client.query(
            'SELECT 1 FROM credit_ledger WHERE idempotency_key = $1',
            [refundKey]
        );
        if (already.rows.length > 0) return;

        // Find the original reservation to know how much to return.
        const reserveRow = await client.query<{ credits_delta: number }>(
            "SELECT credits_delta FROM credit_ledger WHERE idempotency_key = $1 AND kind = 'reserve'",
            [params.reserveKey]
        );
        if (reserveRow.rows.length === 0) return; // nothing was reserved
        const amount = Math.abs(reserveRow.rows[0].credits_delta);
        if (amount === 0) return;

        const credited = await client.query<{ credit_credits: number }>(
            'SELECT public.credit_credits($1, $2) AS credit_credits',
            [params.clinicId, amount]
        );
        const balanceAfter = credited.rows[0]?.credit_credits ?? 0;

        await client.query(
            `INSERT INTO credit_ledger
                (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, generation_id, metadata)
             VALUES ($1, $2, 'refund', $3, $4, $5, $6, $7)`,
            [
                params.clinicId,
                params.action,
                amount,
                balanceAfter,
                refundKey,
                params.generationId || null,
                JSON.stringify({ reason: params.reason || 'generation_failed' }),
            ]
        );
    });
}

/**
 * Confirm a successful generation: report the usage event to Flexprice for
 * metering/invoicing. Credits were already deducted at reserve time, so this
 * does not touch the local balance. Best-effort.
 */
export async function confirm(params: {
    clinic: Clinic;
    action: BillableAction;
    idempotencyKey: string;
    generationId?: string;
    properties?: Record<string, unknown>;
}): Promise<void> {
    if (!flexpriceEnabled()) return;

    try {
        const customerId = await ensureFlexpriceCustomer(params.clinic);
        if (!customerId) return;

        const eventId = await ingestUsageEvent({
            customerId,
            eventName: FLEX_EVENT_NAME[params.action],
            quantity: 1,
            idempotencyKey: `usage:${params.idempotencyKey}`,
            properties: {
                clinic_id: params.clinic.id,
                generation_id: params.generationId,
                ...(params.properties || {}),
            },
        });

        if (eventId && params.generationId) {
            await db.query(
                `UPDATE credit_ledger SET flexprice_event_id = $1
                 WHERE generation_id = $2 AND kind = 'reserve'`,
                [eventId, params.generationId]
            );
        }
    } catch (e) {
        console.error('[credits] confirm() Flexprice sync failed (non-fatal):', e);
    }
}

export interface TopUpResult {
    balanceAfter: number;
    applied: boolean; // false if this top-up was already processed (idempotent)
}

/**
 * Credit a clinic's wallet after a successful Stripe purchase. Idempotent via
 * the Stripe session id, so a replayed webhook never double-credits. Also tops
 * up the Flexprice wallet best-effort.
 */
export async function topUp(params: {
    clinicId: string;
    credits: number;
    stripeSessionId: string;
    metadata?: Record<string, unknown>;
}): Promise<TopUpResult> {
    const key = `stripe:${params.stripeSessionId}`;

    const result = await db.transaction(async (client) => {
        const existing = await client.query(
            'SELECT balance_after FROM credit_ledger WHERE idempotency_key = $1',
            [key]
        );
        if (existing.rows.length > 0) {
            return { balanceAfter: existing.rows[0].balance_after, applied: false };
        }

        const credited = await client.query<{ credit_credits: number }>(
            'SELECT public.credit_credits($1, $2) AS credit_credits',
            [params.clinicId, params.credits]
        );
        const balanceAfter = credited.rows[0]?.credit_credits ?? 0;

        await client.query(
            `INSERT INTO credit_ledger
                (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, stripe_session_id, metadata)
             VALUES ($1, 'topup', 'topup', $2, $3, $4, $5, $6)`,
            [
                params.clinicId,
                params.credits,
                balanceAfter,
                key,
                params.stripeSessionId,
                JSON.stringify(params.metadata || {}),
            ]
        );

        return { balanceAfter, applied: true };
    });

    // Mirror the top-up into Flexprice (best-effort).
    if (result.applied && flexpriceEnabled()) {
        try {
            const clinic = await db.queryOne<Clinic>('SELECT * FROM clinics WHERE id = $1', [params.clinicId]);
            if (clinic) {
                const walletId = await ensureFlexpriceWallet(clinic);
                if (walletId) {
                    await topUpWallet({ walletId, credits: params.credits, reference: key });
                }
            }
        } catch (e) {
            console.error('[credits] topUp() Flexprice sync failed (non-fatal):', e);
        }
    }

    return result;
}

/**
 * Ajuste manual de créditos por un super-admin de plataforma (positivo o negativo).
 * Atómico; registra un movimiento 'adjust' en el ledger. Devuelve el saldo nuevo
 * o null si un ajuste negativo deja saldo insuficiente.
 */
export async function adjustCredits(params: {
    clinicId: string;
    delta: number; // positivo = otorga, negativo = descuenta
    reason: string;
    actor?: string;
}): Promise<{ ok: boolean; balanceAfter?: number; reason?: string }> {
    if (!Number.isInteger(params.delta) || params.delta === 0) {
        return { ok: false, reason: 'delta inválido' };
    }
    const key = `adjust:${params.clinicId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    return db.transaction(async (client) => {
        let balanceAfter: number | null;
        if (params.delta > 0) {
            const r = await client.query<{ credit_credits: number }>(
                'SELECT public.credit_credits($1, $2) AS credit_credits',
                [params.clinicId, params.delta]
            );
            balanceAfter = r.rows[0]?.credit_credits ?? null;
        } else {
            const r = await client.query<{ debit_credits: number | null }>(
                'SELECT public.debit_credits($1, $2) AS debit_credits',
                [params.clinicId, -params.delta]
            );
            balanceAfter = r.rows[0]?.debit_credits ?? null;
            if (balanceAfter == null) return { ok: false, reason: 'insufficient' };
        }
        if (balanceAfter == null) return { ok: false, reason: 'clinic_not_found' };

        await client.query(
            `INSERT INTO credit_ledger
                (clinic_id, action, kind, credits_delta, balance_after, idempotency_key, metadata)
             VALUES ($1, 'adjust', 'adjust', $2, $3, $4, $5)`,
            [
                params.clinicId,
                params.delta,
                balanceAfter,
                key,
                JSON.stringify({ reason: params.reason, actor: params.actor }),
            ]
        );
        return { ok: true, balanceAfter };
    });
}

// ── Flexprice provisioning helpers (lazy, persisted on the clinic row) ────────

async function ensureFlexpriceCustomer(clinic: Clinic): Promise<string | null> {
    if (clinic.flexprice_customer_id) return clinic.flexprice_customer_id;

    const customerId = await ensureCustomer({ externalId: clinic.id, name: clinic.name });
    if (customerId) {
        await db.query('UPDATE clinics SET flexprice_customer_id = $1 WHERE id = $2', [customerId, clinic.id]);
        clinic.flexprice_customer_id = customerId;
    }
    // Flexprice maps events by external_customer_id, so the clinic UUID also
    // works as the customer reference even before provisioning completes.
    return customerId || clinic.id;
}

async function ensureFlexpriceWallet(clinic: Clinic): Promise<string | null> {
    if (clinic.flexprice_wallet_id) return clinic.flexprice_wallet_id;

    const customerId = await ensureFlexpriceCustomer(clinic);
    if (!customerId) return null;

    const walletId = await ensureWallet({ customerId });
    if (walletId) {
        await db.query('UPDATE clinics SET flexprice_wallet_id = $1 WHERE id = $2', [walletId, clinic.id]);
        clinic.flexprice_wallet_id = walletId;
    }
    return walletId;
}

async function getBalanceTx(client: import('pg').PoolClient, clinicId: string): Promise<number> {
    const r = await client.query('SELECT credit_balance FROM clinics WHERE id = $1', [clinicId]);
    return r.rows[0]?.credit_balance ?? 0;
}
