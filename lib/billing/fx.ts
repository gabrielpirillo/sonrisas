/**
 * Moneda por país y tipo de cambio desde USD (solo servidor).
 *
 * Los paquetes tienen su precio base en USD. Para cada país de facturación se
 * convierte al tipo de cambio del día (cacheado 6 h; si el proveedor falla no
 * se reintenta hasta pasados 10 min y se usa el último cambio bueno o el de
 * respaldo) y se redondea a un importe "limpio".
 */

export type BillingCurrency = 'usd' | 'eur' | 'ars' | 'cop' | 'clp' | 'uyu' | 'pyg';

/** País (ISO-2) → moneda de cobro. Ecuador usa USD. Resto del mundo: USD. */
const COUNTRY_CURRENCY: Record<string, BillingCurrency> = {
    ES: 'eur', AR: 'ars', CO: 'cop', CL: 'clp', UY: 'uyu', PY: 'pyg', EC: 'usd',
};

export function currencyForCountry(country: string | null | undefined): BillingCurrency {
    return (country && COUNTRY_CURRENCY[country.toUpperCase()]) || 'usd';
}

/** Monedas sin decimales en Stripe. */
export const ZERO_DECIMAL = new Set(['clp', 'pyg']);

/** Redondeo comercial por moneda (en unidades, no en centavos). */
const ROUND_TO: Record<BillingCurrency, number> = {
    usd: 1, eur: 1, ars: 1000, cop: 1000, clp: 100, uyu: 10, pyg: 1000,
};

/** Respaldo aproximado (USD → moneda) por si el proveedor no está disponible. */
const FALLBACK: Record<BillingCurrency, number> = {
    usd: 1, eur: 0.92, ars: 1400, cop: 4000, clp: 950, uyu: 40, pyg: 7900,
};

/** Tope de Stripe: 8 dígitos en la unidad mínima. */
export const STRIPE_MAX_MINOR = 99_999_999;

let cache: { at: number; rates: Record<string, number> } | null = null;
const TTL = 6 * 60 * 60_000;
/** Tras un fallo del proveedor no se reintenta durante 10 min. */
const FAIL_TTL = 10 * 60_000;
let failedAt = 0;
/** Una sola petición en curso compartida por todas las llamadas concurrentes. */
let inflight: Promise<Record<string, number>> | null = null;
/** Último valor plausible recibido por moneda. */
const lastGood: Partial<Record<BillingCurrency, number>> = {};

const knownRates = (): Record<string, number> => cache?.rates ?? { ...FALLBACK, ...lastGood };

async function fetchRates(): Promise<Record<string, number>> {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
            signal: AbortSignal.timeout(4000),
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
        if (json.result !== 'success' || !json.rates) throw new Error('respuesta inesperada');
        const rates: Record<string, number> = {};
        for (const cur of Object.keys(FALLBACK) as BillingCurrency[]) {
            const r = Number(json.rates[cur.toUpperCase()]);
            // Valor plausible (entre la mitad y 3× el respaldo); si no, el último bueno o el respaldo.
            if (r > FALLBACK[cur] / 2 && r < FALLBACK[cur] * 3) {
                rates[cur] = r;
                lastGood[cur] = r;
            } else {
                rates[cur] = lastGood[cur] ?? FALLBACK[cur];
                console.warn(`[fx] Cambio USD→${cur.toUpperCase()} implausible (${json.rates[cur.toUpperCase()]}); uso ${rates[cur]}${lastGood[cur] ? ' (último válido)' : ' (respaldo)'}`);
            }
        }
        cache = { at: Date.now(), rates };
        failedAt = 0;
        return rates;
    } catch (e) {
        failedAt = Date.now();
        console.warn('[fx] Proveedor de cambio no disponible; uso el último cambio conocido o el de respaldo:', e instanceof Error ? e.message : e);
        return knownRates();
    }
}

async function usdRates(): Promise<Record<string, number>> {
    if (cache && Date.now() - cache.at < TTL) return cache.rates;
    if (failedAt && Date.now() - failedAt < FAIL_TTL) return knownRates();
    if (!inflight) inflight = fetchRates().finally(() => { inflight = null; });
    return inflight;
}

/**
 * Convierte un precio en centavos de USD a la moneda del país.
 * Devuelve USD si la moneda es USD o si el importe superaría el tope de Stripe.
 */
export async function convertFromUsd(usdCents: number, cur: BillingCurrency): Promise<{ priceCents: number; currency: string }> {
    if (cur === 'usd') return { priceCents: usdCents, currency: 'usd' };
    const rate = (await usdRates())[cur] ?? FALLBACK[cur];
    const step = ROUND_TO[cur];
    const units = Math.max(step, Math.round(((usdCents / 100) * rate) / step) * step);
    const minor = ZERO_DECIMAL.has(cur) ? units : units * 100;
    if (minor > STRIPE_MAX_MINOR) return { priceCents: usdCents, currency: 'usd' };
    return { priceCents: minor, currency: cur };
}
