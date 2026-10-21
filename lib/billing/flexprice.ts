/**
 * Flexprice client (best-effort metering / billing system of record).
 *
 * Flexprice is the open-source usage-based billing platform we self-host
 * (https://github.com/flexprice/flexprice). In this app it is the system of
 * record for metering and invoicing, NOT for gating: credit gating is enforced
 * locally and atomically in Postgres (see lib/billing/credits.ts) so that the
 * latency-sensitive AI routes never depend on Flexprice availability.
 *
 * Every function here is BEST-EFFORT: it never throws. On any failure it logs
 * and returns null/false so the caller can proceed. The local ledger remains
 * the source of truth and can be reconciled with Flexprice later.
 *
 * Endpoints follow Flexprice's documented REST shape (customers / wallets /
 * events), verified against the official API reference. Paths here are version-
 * less; set FLEXPRICE_API_URL to include the API version, e.g.
 *   self-host:  http://flexprice-api:8080/v1
 *   cloud:      https://api.flexprice.io/v1
 */

const BASE_URL = process.env.FLEXPRICE_API_URL?.replace(/\/$/, '') || '';
const API_KEY = process.env.FLEXPRICE_API_KEY || '';
// Flexprice scopes every request to an environment via this header. Defaults to
// the seeded Production environment if not overridden.
const ENVIRONMENT_ID = process.env.FLEXPRICE_ENVIRONMENT_ID || '00000000-0000-0000-0000-000000000001';

/** Whether Flexprice integration is configured. */
export function flexpriceEnabled(): boolean {
    return Boolean(BASE_URL && API_KEY);
}

async function flexFetch<T = any>(
    path: string,
    init: Omit<RequestInit, 'body'> & { body?: any } = {}
): Promise<T | null> {
    if (!flexpriceEnabled()) return null;

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            method: init.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Flexprice authenticates API requests with an API key header.
                'x-api-key': API_KEY,
                Authorization: `Bearer ${API_KEY}`,
                // Required: scopes the request to a Flexprice environment.
                'X-Environment-ID': ENVIRONMENT_ID,
                ...(init.headers || {}),
            },
            body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
            // Best-effort: nunca debe bloquear la compra ni la generación.
            signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) {
            const txt = await res.text().catch(() => '');
            console.error(`[flexprice] ${init.method || 'GET'} ${path} failed (${res.status}): ${txt.slice(0, 300)}`);
            return null;
        }

        if (res.status === 204) return {} as T;
        return (await res.json()) as T;
    } catch (e) {
        console.error(`[flexprice] ${init.method || 'GET'} ${path} threw:`, e);
        return null;
    }
}

/**
 * Ensure a Flexprice customer exists for a clinic. Returns the external
 * customer id (or null on failure). `externalId` lets us map our clinic UUID
 * to the Flexprice customer idempotently.
 */
export async function ensureCustomer(params: {
    externalId: string;
    name: string;
    email?: string;
}): Promise<string | null> {
    const data = await flexFetch<{ id?: string; customer?: { id: string } }>('/customers', {
        method: 'POST',
        body: {
            external_id: params.externalId,
            name: params.name,
            email: params.email,
        },
    });
    return data?.id || data?.customer?.id || null;
}

/**
 * Ensure a prepaid credit wallet exists for a customer. Returns the wallet id.
 * Uses conversion_rate '1' so 1 unit of currency == 1 credit.
 */
export async function ensureWallet(params: {
    customerId: string;
    currency?: string;
}): Promise<string | null> {
    const data = await flexFetch<{ id?: string; wallet?: { id: string } }>('/wallets', {
        method: 'POST',
        body: {
            external_customer_id: params.customerId,
            currency: params.currency || 'USD',
            conversion_rate: '1',
        },
    });
    return data?.id || data?.wallet?.id || null;
}

/**
 * Top up a wallet with prepaid credits. `reason` maps to Flexprice's
 * transaction_reason (e.g. PURCHASED_CREDIT_DIRECT for a Stripe purchase,
 * FREE_CREDIT_GRANT for a promo). Idempotent via idempotency_key.
 */
export async function topUpWallet(params: {
    walletId: string;
    credits: number;
    reference?: string;
    reason?: string;
}): Promise<boolean> {
    const data = await flexFetch(`/wallets/${params.walletId}/top-up`, {
        method: 'POST',
        body: {
            transaction_reason: params.reason || 'PURCHASED_CREDIT_DIRECT',
            credits_to_add: String(params.credits),
            idempotency_key: params.reference,
        },
    });
    return data !== null;
}

/**
 * Ingest a usage event (one successful image/video generation). Flexprice
 * meters this against the customer's plan and decrements their wallet.
 * Returns the event id on success.
 */
export async function ingestUsageEvent(params: {
    customerId: string;
    eventName: string; // 'image_generation' | 'video_generation'
    quantity?: number;
    timestamp?: string;
    properties?: Record<string, unknown>;
    idempotencyKey?: string;
}): Promise<string | null> {
    const data = await flexFetch<{ id?: string; event?: { id: string } }>('/events', {
        method: 'POST',
        body: {
            external_customer_id: params.customerId,
            event_name: params.eventName,
            timestamp: params.timestamp || new Date().toISOString(),
            // Flexprice dedupes on event id when provided.
            event_id: params.idempotencyKey,
            properties: {
                quantity: params.quantity ?? 1,
                ...(params.properties || {}),
            },
        },
    });
    return data?.id || data?.event?.id || null;
}

/**
 * Read a customer's real-time wallet balance (for reconciliation/reporting).
 * Resolves wallets by external customer id via GET /customers/wallets.
 */
export async function getWalletBalance(externalCustomerId: string): Promise<number | null> {
    const data = await flexFetch<Array<{ balance?: string; real_time_balance?: string }>>(
        `/customers/wallets?id=${encodeURIComponent(externalCustomerId)}&include_real_time_balance=true`
    );
    const wallet = Array.isArray(data) ? data[0] : null;
    if (!wallet) return null;
    const raw = wallet.real_time_balance ?? wallet.balance;
    return raw != null ? Number(raw) : null;
}
